# hls-truncate

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![npm](https://img.shields.io/npm/v/@eyevinn/hls-truncate)](https://www.npmjs.com/package/@eyevinn/hls-truncate) [![Coverage Status](https://coveralls.io/repos/github/Eyevinn/hls-truncate/badge.svg?branch=main)](https://coveralls.io/github/Eyevinn/hls-truncate?branch=main) [![Slack](http://slack.streamingtech.se/badge.svg)](http://slack.streamingtech.se)

Node library to create an HLS VOD by truncating the length of an existing HLS VOD. Supports video, audio, and subtitle tracks with demuxed content.

## Installation

```
npm install --save @eyevinn/hls-truncate
```

Requires Node >= 20.

## Usage

### Basic — truncate to a target duration

```javascript
const HLSTruncateVod = require('@eyevinn/hls-truncate');

const hlsVod = new HLSTruncateVod('https://example.com/vod/playlist.m3u8', 4);
hlsVod.load().then(() => {
  const bandwidths = hlsVod.getBandwidths();
  const mediaManifest = hlsVod.getMediaManifest(bandwidths[0]);
  console.log(mediaManifest);
});
```

### With start-time offset

Skip the first 10 seconds, then take the next 4 seconds:

```javascript
const hlsVod = new HLSTruncateVod('https://example.com/vod/playlist.m3u8', 4, { offset: 10 });
hlsVod.load().then(() => {
  const mediaManifest = hlsVod.getMediaManifest(4928000);
  console.log(mediaManifest);
});
```

### Demuxed content (audio and subtitles)

```javascript
const hlsVod = new HLSTruncateVod('https://example.com/vod/playlist.m3u8', 15);
hlsVod.load().then(() => {
  // Video
  const bandwidths = hlsVod.getBandwidths();
  console.log(hlsVod.getMediaManifest(bandwidths[0]));

  // Audio — list available groups and languages
  const audioGroupIds = hlsVod.getAudioGroupIds();
  const audioLangs = hlsVod.getAudioLanguagesForGroupId(audioGroupIds[0]);
  console.log(hlsVod.getAudioManifest(audioGroupIds[0], audioLangs[0]));

  // Subtitles — list available groups and languages
  const subGroupIds = hlsVod.getSubtitleGroupIds();
  if (subGroupIds.length > 0) {
    const subLangs = hlsVod.getSubtitleLanguagesForGroupId(subGroupIds[0]);
    console.log(hlsVod.getSubtitleManifest(subGroupIds[0], subLangs[0]));
  }
});
```

## API

### `new HLSTruncateVod(masterManifestUri, duration, [options])`

| Parameter | Type | Description |
|---|---|---|
| `masterManifestUri` | `string` | URL to the HLS master manifest |
| `duration` | `number` | Target duration in seconds (truncates to the nearest segment boundary) |
| `options.offset` | `number` | Optional. Seconds to skip from the start before truncating |

### `load()` → `Promise<void>`

Fetches and parses the master manifest and all media/audio/subtitle playlists, then truncates the segment lists. Video is processed first, then audio and subtitles are aligned to match the video duration.

### `getBandwidths()` → `number[]`

Returns the list of bandwidths found in the master manifest.

### `getMediaManifest(bandwidth)` → `string`

Returns the truncated video media playlist for the given bandwidth.

### `getAudioManifest(audioGroupId, language)` → `string | null`

Returns the truncated audio playlist for the given group ID and language. Falls back to the first available group/language if no exact match is found. Returns `null` if no audio tracks exist.

### `getAudioGroupIds()` → `string[]`

Returns the list of audio group IDs found in the master manifest.

### `getAudioLanguagesForGroupId(audioGroupId)` → `string[]`

Returns the available languages for a given audio group ID.

### `getSubtitleManifest(subtitleGroupId, language)` → `string | null`

Returns the truncated subtitle playlist for the given group ID and language. Falls back to the first available group/language if no exact match is found. Returns `null` if no subtitle tracks exist.

### `getSubtitleGroupIds()` → `string[]`

Returns the list of subtitle group IDs found in the master manifest.

### `getSubtitleLanguagesForGroupId(subtitleGroupId)` → `string[]`

Returns the available languages for a given subtitle group ID.

## How It Works

The library truncates an HLS VOD to the nearest possible duration based on segment boundaries. Since segments have fixed durations, the actual output length is the closest match to the requested duration.

**Example — truncating a 30s VOD to ~5s:**

Input (10 segments x 3s = 30s):
```
#EXTM3U
#EXT-X-TARGETDURATION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:3.000,
segment1_0_av.ts
#EXTINF:3.000,
segment2_0_av.ts
...
#EXTINF:3.000,
segment10_0_av.ts
#EXT-X-ENDLIST
```

Output (2 segments x 3s = 6s, closest to 5s):
```
#EXTM3U
#EXT-X-TARGETDURATION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:3.000,
segment1_0_av.ts
#EXTINF:3.000,
segment2_0_av.ts
#EXT-X-ENDLIST
```

When using an `offset`, segments are first removed from the start (rounded to the nearest segment boundary), then the remaining playlist is truncated to the target duration. Audio and subtitle tracks are aligned to match the video track's actual duration, with compensation for differing segment lengths between tracks.

# Authors

This open source project is maintained by Eyevinn Technology.

## Contributors

- Jonas Birme (jonas.birme@eyevinn.se)
- Alan Allard (alan.allard@eyevinn.se)

# [Contributing](CONTRIBUTING.md)

In addition to contributing code, you can help to triage issues. This can include reproducing bug reports, or asking for vital information such as version numbers or reproduction instructions.

# License (MIT)

Copyright 2021 Eyevinn Technology AB

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!
