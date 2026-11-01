<div align="center">

# KonaTube

[![Platform: iOS 15+](https://img.shields.io/badge/iOS-15%2B-black.svg?logo=apple&logoColor=white&style=for-the-badge)](#building "Platform")
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](COPYING "License")
[![SponsorBlock](https://img.shields.io/badge/-SponsorBlock-00a0a0.svg?style=for-the-badge)](https://sponsor.ajay.app "SponsorBlock")
[![Built on Linux](https://img.shields.io/badge/Built_on-Linux-fcc624.svg?logo=linux&logoColor=black&style=for-the-badge)](#building "Building")
[![No Apple SDK](https://img.shields.io/badge/-No_Apple_SDK-brightgreen.svg?style=for-the-badge)](#building "Building")

</div>

Free software, licensed under the [GNU AGPLv3](COPYING) (see [License](#license)).

An iPhone app that shows mobile YouTube (m.youtube.com) with these built in:

- **Ad blocking.** Ads are stripped from the data YouTube sends, ad requests are blocked,
  and any ad that still plays is skipped.
- **SponsorBlock.** Sponsor segments, self-promotion, intros and outros are skipped,
  using [SponsorBlock](https://sponsor.ajay.app).
- **No Shorts or Playables.** They are removed from the feed, search and the bottom bar.
- **Background play.** Audio keeps playing with the app in the background or the screen locked.
- **Tweaks.** The bottom bar stays visible on every page, and feeds load ahead as you scroll.

> [!WARNING]
> YouTube keeps changing how it delivers ads, so an occasional ad may get through
> until the blocking is updated.

## Download

<p align="center">
  <a href="https://github.com/kzopal/konatube/releases/latest">
    <img src="https://img.shields.io/badge/Download-.ipa-2ea44f.svg?logo=apple&logoColor=white&style=for-the-badge" alt="Download .ipa" height="50">
  </a>
</p>

Install the IPA with SideStore or LiveContainer, or [build it yourself](#building).

## How it works

```mermaid
graph LR
    App[KonaTube] --> Web[m.youtube.com in a web view]
    Rules[Blocking rules] --> Web
    Scripts[Injected scripts] --> Web
    Web --> You([YouTube without ads, Shorts or sponsors])
```

The app is one small native file that opens YouTube's mobile site. Everything else is
blocking rules and scripts that run inside the page.

<details>
<summary><b>Files</b></summary>

| Path | What it is |
|---|---|
| `src/main.m` | The whole native app: a web view with the scripts below injected |
| `inject/rules.json` | Blocks ad and tracking requests, hides ad elements |
| `inject/adblock.js` | Strips ads from YouTube's data, skips any that slip through |
| `inject/noshorts.js` | Removes Shorts and Playables |
| `inject/sponsorblock.js` | Skips sponsor segments |
| `inject/background.js` | Keeps audio playing in the background |
| `inject/tweaks.js` | Bottom bar on every page, feeds load further ahead |
| `include/rt.h`, `stubs/` | Hand-written iOS headers and link stubs, used instead of Apple's SDK |
| `res/Info.plist` | App metadata |

</details>

## Building

Linux with free tools only: no Mac, Xcode or Apple SDK needed.

```sh
sudo apt install clang-18 lld-18 python3
./build.sh
```

This writes `build/KonaTube-v<VERSION>.ipa` (the version comes from `VERSION`).

> [!NOTE]
> The IPA is unsigned (ad-hoc), so install it with a sideloading tool such as
> SideStore or LiveContainer.

## License

Copyright (C) 2026 opal. KonaTube is licensed under the GNU AGPLv3 or later.

<details>
<summary>License notice</summary>

KonaTube is free software: you can redistribute it and/or modify it under the
terms of the GNU Affero General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

KonaTube is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with KonaTube, in the file `COPYING`. If not, see <https://www.gnu.org/licenses/>.

</details>
