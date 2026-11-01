/*
 * main.m - KonaTube: mobile YouTube (m.youtube.com) in a web view, with
 * ad blocking and SponsorBlock built in.
 *
 *   inject/rules.json       content blocker: ad/tracking requests and ad elements
 *   inject/adblock.js       strips ads from YouTube's data, skips any that slip through
 *   inject/noshorts.js      removes Shorts and Playables from feeds and search
 *   inject/tweaks.js        bottom bar on every page, feeds load further ahead
 *   inject/sponsorblock.js  skips sponsor segments (sponsor.ajay.app)
 *   inject/background.js    keeps audio playing when the app is in the background
 *
 * Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
 */
#include "rt.h"

static NSString *const kHome = @"https://m.youtube.com/";
static NSString *const kMobileSafariUA =
    @"Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 "
    @"(KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
static NSString *const kCookiesKey = @"cookies";

static NSString *resource(NSString *name) {
    NSString *dir = [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"inject"];
    NSString *text = [NSString stringWithContentsOfFile:[dir stringByAppendingPathComponent:name]
                                               encoding:NSUTF8StringEncoding error:NULL];
    if (!text) NSLog(@"KonaTube: missing inject/%@", name);
    return text;
}

#pragma mark - cookies

/*
 * The sign-in lives in cookies. WebKit's own cookie storage doesn't
 * reliably survive the app being closed, so they are also kept in the
 * app's settings and put back before the first page loads.
 */
static WKHTTPCookieStore *cookieStore(void) {
    return [[WKWebsiteDataStore defaultDataStore] httpCookieStore];
}

static void saveCookies(void) {
    [cookieStore() getAllCookies:^(NSArray *cookies) {
        NSMutableArray *saved = [NSMutableArray array];
        for (NSHTTPCookie *c in cookies) {
            NSDictionary *props = [c properties];
            if (props) [saved addObject:props];
        }
        [[NSUserDefaults standardUserDefaults] setObject:saved forKey:kCookiesKey];
    }];
}

static void restoreCookies(void (^done)(void)) {
    NSArray *saved = [[NSUserDefaults standardUserDefaults] arrayForKey:kCookiesKey];
    __block NSInteger pending = 1;
    void (^finishOne)(void) = ^{ if (--pending == 0) done(); };
    for (NSDictionary *props in saved ?: @[]) {
        NSHTTPCookie *c = [NSHTTPCookie cookieWithProperties:props];
        NSDate *expires = [c expiresDate];
        if (!c || (expires && [expires timeIntervalSinceNow] < 0)) continue;
        pending++;
        [cookieStore() setCookie:c completionHandler:finishOne];
    }
    finishOne();
}

#pragma mark - web view

@interface LTViewController : UIViewController <WKNavigationDelegate> {
    WKWebView *_web;
}
@end

@implementation LTViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [[self view] setBackgroundColor:[UIColor blackColor]];

    WKWebViewConfiguration *config = [WKWebViewConfiguration new];
    [config setAllowsInlineMediaPlayback:YES];
    [config setAllowsPictureInPictureMediaPlayback:YES];
    [config setMediaTypesRequiringUserActionForPlayback:0];
    WKUserContentController *content = [config userContentController];
    for (NSString *name in @[ @"background.js", @"tweaks.js", @"adblock.js", @"noshorts.js", @"sponsorblock.js" ]) {
        NSString *source = resource(name);
        if (source)
            [content addUserScript:[[WKUserScript alloc] initWithSource:source
                                                          injectionTime:0   /* document start */
                                                       forMainFrameOnly:YES]];
    }

    _web = [[WKWebView alloc] initWithFrame:[[self view] bounds] configuration:config];
    [_web setCustomUserAgent:kMobileSafariUA];
    [_web setAllowsBackForwardNavigationGestures:YES];
    [_web setNavigationDelegate:self];
    if ([_web respondsToSelector:@selector(setInspectable:)]) [_web setInspectable:YES];
    [[self view] addSubview:_web];

    /* Cookies and blocking rules first, so the first page is signed in and ad-free. */
    WKWebView *web = _web;
    NSURLRequest *home = [NSURLRequest requestWithURL:[NSURL URLWithString:kHome]];
    restoreCookies(^{
        NSString *rules = resource(@"rules.json");
        if (!rules) { [web loadRequest:home]; return; }
        [[WKContentRuleListStore defaultStore]
            compileContentRuleListForIdentifier:@"adblock"
                         encodedContentRuleList:rules
                              completionHandler:^(WKContentRuleList *list, NSError *error) {
            if (list) [content addContentRuleList:list];
            else NSLog(@"KonaTube: blocking rules rejected: %@", [error localizedDescription]);
            [web loadRequest:home];
        }];
    });
}

/*
 * Keep the page out from under the status bar. At the bottom only a third
 * of the home indicator's space is kept, so the bottom bar sits low.
 */
- (void)viewDidLayoutSubviews {
    [super viewDidLayoutSubviews];
    CGRect b = [[self view] bounds];
    UIEdgeInsets safe = [[self view] safeAreaInsets];
    CGFloat bottom = safe.bottom / 3;
    [_web setFrame:CGRectMake(b.origin.x + safe.left, b.origin.y + safe.top,
                              b.size.width - safe.left - safe.right,
                              b.size.height - safe.top - bottom)];
}

/* Every finished page (sign-in included) saves the cookies. */
- (void)webView:(WKWebView *)webView didFinishNavigation:(id)navigation {
    saveCookies();
}

@end

#pragma mark - app

@interface AppDelegate : UIResponder {
    UIWindow *_window;
}
@end

@implementation AppDelegate

- (UIWindow *)window { return _window; }
- (void)setWindow:(UIWindow *)window { _window = window; }

- (BOOL)application:(id)application didFinishLaunchingWithOptions:(id)options {
    /* "Playback" keeps audio going in the background and on the lock screen. */
    AVAudioSession *session = [AVAudioSession sharedInstance];
    [session setCategory:kAVAudioSessionCategoryPlayback error:NULL];
    [session setActive:YES error:NULL];

    _window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
    [_window setRootViewController:[LTViewController new]];
    [_window makeKeyAndVisible];
    return YES;
}

/* Save the cookies whenever the app leaves the screen, before it can be closed. */
- (void)applicationDidEnterBackground:(id)application { saveCookies(); }
- (void)applicationWillTerminate:(id)application { saveCookies(); }

@end

int main(int argc, char *argv[]) {
    @autoreleasepool {
        return UIApplicationMain(argc, argv, nil, @"AppDelegate");
    }
}
