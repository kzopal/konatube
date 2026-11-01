/*
 * rt.h - hand-written declarations for the iOS system libraries.
 *
 * This replaces Apple's SDK headers: only what the app uses is declared.
 * Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
 */
#ifndef RT_H
#define RT_H

/* ---- basic types ---- */
typedef _Bool BOOL;           /* BOOL is a real bool on arm64 iOS */
#define YES ((BOOL)1)
#define NO  ((BOOL)0)
#define nil ((id)0)
#define NULL ((void *)0)

typedef long NSInteger;
typedef unsigned long NSUInteger;
typedef double CGFloat;

typedef struct { CGFloat x, y; } CGPoint;
typedef struct { CGFloat width, height; } CGSize;
typedef struct { CGPoint origin; CGSize size; } CGRect;
typedef struct { CGFloat top, left, bottom, right; } UIEdgeInsets;
typedef double NSTimeInterval;

static inline CGRect CGRectMake(CGFloat x, CGFloat y, CGFloat w, CGFloat h) {
    CGRect r = { { x, y }, { w, h } };
    return r;
}

typedef struct {
    unsigned long state;
    __unsafe_unretained id *itemsPtr;
    unsigned long *mutationsPtr;
    unsigned long extra[5];
} NSFastEnumerationState;

/* ---- libobjc ---- */
__attribute__((objc_root_class))
@interface NSObject {
    Class isa;
}
+ (instancetype)alloc;
+ (instancetype)new;
- (instancetype)init;
- (BOOL)respondsToSelector:(SEL)sel;
@end

/* ---- Foundation ---- */
#define NSUTF8StringEncoding 4

@class NSError;

@interface NSString : NSObject
+ (instancetype)stringWithContentsOfFile:(NSString *)path encoding:(NSUInteger)encoding
                                   error:(NSError **)error;
- (NSString *)stringByAppendingPathComponent:(NSString *)s;
@end

@interface NSArray : NSObject
+ (instancetype)arrayWithObjects:(const id [])objects count:(NSUInteger)count;
- (NSUInteger)countByEnumeratingWithState:(NSFastEnumerationState *)state
                                  objects:(__unsafe_unretained id [])buffer
                                    count:(NSUInteger)len;
@end

@interface NSMutableArray : NSArray
+ (instancetype)array;
- (void)addObject:(id)obj;
@end

@interface NSDictionary : NSObject
- (NSUInteger)countByEnumeratingWithState:(NSFastEnumerationState *)state
                                  objects:(__unsafe_unretained id [])buffer
                                    count:(NSUInteger)len;
@end

@interface NSDate : NSObject
- (NSTimeInterval)timeIntervalSinceNow;
@end

@interface NSHTTPCookie : NSObject
+ (instancetype)cookieWithProperties:(NSDictionary *)properties;
- (NSDictionary *)properties;
- (NSDate *)expiresDate;
@end

@interface NSUserDefaults : NSObject
+ (NSUserDefaults *)standardUserDefaults;
- (NSArray *)arrayForKey:(NSString *)key;
- (void)setObject:(id)value forKey:(NSString *)key;
@end

@interface NSError : NSObject
- (NSString *)localizedDescription;
@end

@interface NSURL : NSObject
+ (instancetype)URLWithString:(NSString *)s;
@end

@interface NSURLRequest : NSObject
+ (instancetype)requestWithURL:(NSURL *)url;
@end

@interface NSBundle : NSObject
+ (NSBundle *)mainBundle;
- (NSString *)resourcePath;
@end

void NSLog(NSString *format, ...);

/* ---- UIKit ---- */
@interface UIResponder : NSObject
@end

@interface UIColor : NSObject
+ (UIColor *)blackColor;
@end

@interface UIScreen : NSObject
+ (UIScreen *)mainScreen;
- (CGRect)bounds;
@end

@interface UIView : UIResponder
- (instancetype)initWithFrame:(CGRect)frame;
- (CGRect)bounds;
- (void)addSubview:(UIView *)view;
- (void)setBackgroundColor:(UIColor *)color;
- (void)setFrame:(CGRect)frame;
- (UIEdgeInsets)safeAreaInsets;
@end

@interface UIViewController : UIResponder
- (UIView *)view;
- (void)viewDidLoad;
- (void)viewDidLayoutSubviews;
@end

@interface UIWindow : UIView
- (void)setRootViewController:(UIViewController *)controller;
- (void)makeKeyAndVisible;
@end

int UIApplicationMain(int argc, char *argv[], NSString *principalClassName,
                      NSString *delegateClassName);

/* ---- WebKit ---- */
@interface WKUserScript : NSObject
- (instancetype)initWithSource:(NSString *)source injectionTime:(NSInteger)time   /* 0 = document start */
              forMainFrameOnly:(BOOL)mainFrameOnly;
@end

@interface WKContentRuleList : NSObject
@end

@interface WKContentRuleListStore : NSObject
+ (instancetype)defaultStore;
- (void)compileContentRuleListForIdentifier:(NSString *)identifier
                     encodedContentRuleList:(NSString *)rules
                          completionHandler:(void (^)(WKContentRuleList *list, NSError *error))handler;
@end

@interface WKHTTPCookieStore : NSObject
- (void)getAllCookies:(void (^)(NSArray *cookies))handler;
- (void)setCookie:(NSHTTPCookie *)cookie completionHandler:(void (^)(void))handler;
@end

@interface WKWebsiteDataStore : NSObject
+ (WKWebsiteDataStore *)defaultDataStore;
- (WKHTTPCookieStore *)httpCookieStore;
@end

@protocol WKNavigationDelegate
@end

@interface WKUserContentController : NSObject
- (void)addUserScript:(WKUserScript *)script;
- (void)addContentRuleList:(WKContentRuleList *)list;
@end

@interface WKWebViewConfiguration : NSObject
- (WKUserContentController *)userContentController;
- (void)setAllowsInlineMediaPlayback:(BOOL)allow;
- (void)setAllowsPictureInPictureMediaPlayback:(BOOL)allow;
- (void)setMediaTypesRequiringUserActionForPlayback:(NSUInteger)types;   /* 0 = none */
@end

@interface WKWebView : UIView
- (instancetype)initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)config;
- (id)loadRequest:(NSURLRequest *)request;
- (void)setCustomUserAgent:(NSString *)ua;
- (void)setAllowsBackForwardNavigationGestures:(BOOL)allow;
- (void)setNavigationDelegate:(id)delegate;
- (void)setInspectable:(BOOL)inspectable;
@end

/* ---- AVFoundation ---- */
@interface AVAudioSession : NSObject
+ (AVAudioSession *)sharedInstance;
- (BOOL)setCategory:(NSString *)category error:(NSError **)err;
- (BOOL)setActive:(BOOL)active error:(NSError **)err;
@end

#define kAVAudioSessionCategoryPlayback @"AVAudioSessionCategoryPlayback"

#endif
