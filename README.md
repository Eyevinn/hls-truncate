# hls-truncate

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