#!/bin/sh
# Build KonaTube-v<VERSION>.ipa using only free software: clang + ld64.lld (LLVM).
# No Apple SDK: headers are include/rt.h, link stubs are stubs/*.tbd.
# Copyright (C) 2026 opal. License: AGPL-3.0-or-later.
set -eu
cd "$(dirname "$0")"

PATH=/usr/lib/llvm-18/bin:$PATH
TARGET=arm64-apple-ios15.0
BUILD=build
APP=$BUILD/Payload/KonaTube.app
VERSION=$(cat VERSION)
IPA=$BUILD/KonaTube-v$VERSION.ipa

rm -rf "$BUILD"
mkdir -p "$APP"

for src in src/*.m; do
    clang -target "$TARGET" -fobjc-runtime=ios-15.0 -fobjc-arc -fblocks -fno-exceptions -fno-objc-exceptions \
        -nostdinc -Iinclude -O2 -Wall -c "$src" -o "$BUILD/$(basename "$src" .m).o"
done

ld64.lld -arch arm64 -platform_version ios 15.0 18.0 \
    -o "$APP/KonaTube" "$BUILD"/*.o stubs/*.tbd -adhoc_codesign

printf 'APPL????' > "$APP/PkgInfo"

# Injected into m.youtube.com: blocking rules and page scripts (see src/main.m).
cp -R inject "$APP/inject"

# Info.plist, stamped with the version from the VERSION file.
python3 - res/Info.plist "$APP/Info.plist" "$VERSION" <<'PY'
import plistlib, sys
src, dst, version = sys.argv[1:]
with open(src, "rb") as f:
    info = plistlib.load(f)
info["CFBundleShortVersionString"] = version
info["CFBundleVersion"] = version
with open(dst, "wb") as f:
    plistlib.dump(info, f)
PY

python3 - "$BUILD" "$IPA" <<'PY'
import os, sys, zipfile
build, ipa = sys.argv[1:]
with zipfile.ZipFile(ipa, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(os.path.join(build, "Payload")):
        for f in files:
            p = os.path.join(root, f)
            info = zipfile.ZipInfo.from_file(p, os.path.relpath(p, build))
            info.external_attr = (0o100755 if f == "KonaTube" else 0o100644) << 16
            with open(p, "rb") as fh:
                z.writestr(info, fh.read(), zipfile.ZIP_DEFLATED)
PY

echo "built $IPA"
