# hls-truncate

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Coverage Status](https://coveralls.io/repos/github/Eyevinn/hls-truncate/badge.svg?branch=master)](https://coveralls.io/github/Eyevinn/hls-truncate?branch=master) [![Slack](http://slack.streamingtech.se/badge.svg)](http://slack.streamingtech.se)

Node library to create an HLS by truncating the length of an HLS VOD.

## Installation

```
npm install --save @eyevinn/hls-truncate
```

## Usage

The code below shows an example on how an HLS VOD of 30 seconds can be truncated into a new VOD of approx 4 seconds.

```
const hlsVod = new HLSTruncateVod('http://testcontent.eyevinn.technology/slates/30seconds/playlist.m3u8', 4);
hlsVod.load()
.then(() => {
  const mediaManifest = hlsVod.getMediaManifest(4928000);
  console.log(mediaManifest);
});
```

What this library does can be illustrated by this simplified example below.

Consider the following:

```
#EXTM3U
#EXT-X-TARGETDURATION:3
#EXT-X-ALLOW-CACHE:YES
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:3.000,
segment1_0_av.ts
#EXTINF:3.000,
segment2_0_av.ts
#EXTINF:3.000,
segment3_0_av.ts
#EXTINF:3.000,
segment4_0_av.ts
#EXTINF:3.000,
segment5_0_av.ts
#EXTINF:3.000,
segment6_0_av.ts
#EXTINF:3.000,
segment7_0_av.ts
#EXTINF:3.000,
segment8_0_av.ts
#EXTINF:3.000,
segment9_0_av.ts
#EXTINF:3.000,
segment10_0_av.ts
#EXT-X-ENDLIST
```

and with this library we can generate a new VOD by truncating to the nearest possible length (depending on segment length). Eg. for a target length of 5, this will result in:

```
#EXTM3U
#EXT-X-TARGETDURATION:3
#EXT-X-ALLOW-CACHE:YES
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:3.000,
segment1_0_av.ts
#EXTINF:3.000,
segment2_0_av.ts
#EXT-X-ENDLIST
```

# Authors

This open source project is maintained by Eyevinn Technology.

## Contributors

- Jonas Rydholm Birmé (jonas.birme@eyevinn.se)
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
