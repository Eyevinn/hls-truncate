const m3u8 = require('@eyevinn/m3u8');
const fetch = require('node-fetch');
const url = require('url');

class HLSTruncateVod {
  constructor(vodManifestUri, duration, options) {
    this.masterManifestUri = vodManifestUri;
    this.playlists = {};
    this.duration = duration;
    this.durationAudio = 0;
    this.bandwiths = [];
    this.audioSegments = {};
    if (options && options.offset) {
      this.startOffset = options.offset;
    }
  }

  load(_injectMasterManifest, _injectMediaManifest, _injectAudioManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        this.m3u = m3u;
        let mediaManifestPromises = [];
        let audioManifestPromises = [];
        let baseUrl;
        let audioGroups = {};
        const m = this.masterManifestUri.match(/^(.*)\/.*?$/);
        if (m) {
          baseUrl = m[1] + '/';
        }

        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];
          this.bandwiths.push(streamItem.get('bandwidth'));
          const mediaManifestUrl = url.resolve(baseUrl, streamItem.get('uri'));
          if (!m3u.items.MediaItem.find((mediaItem) => mediaItem.get("type") === "AUDIO" && mediaItem.get("uri") == streamItem.get("uri"))) {
            mediaManifestPromises.push(this._loadMediaManifest(mediaManifestUrl, streamItem.get('bandwidth'), _injectMediaManifest));
          }
        }

        Promise.all(mediaManifestPromises).then(() => {
          for (let i = 0; i < m3u.items.StreamItem.length; i++) {
            const streamItem = m3u.items.StreamItem[i];
            if (streamItem.attributes.attributes["audio"]) {
              let audioGroupId = streamItem.attributes.attributes["audio"];
              if (!this.audioSegments[audioGroupId]) {
                this.audioSegments[audioGroupId] = {};
              }

              let audioGroupItems = m3u.items.MediaItem.filter((item) => {
                return item.attributes.attributes.type === "AUDIO" && item.attributes.attributes["group-id"] === audioGroupId;
              });
              // # Find all langs amongst the mediaItems that have this group id.
              // # It extracts each mediaItems language attribute value.
              // # ALSO initialize in this.audioSegments a lang. property whos value is an array [{seg1}, {seg2}, ...].
              let audioLanguages = audioGroupItems.map((item) => {
                let itemLang;
                if (!item.attributes.attributes["language"]) {
                  itemLang = item.attributes.attributes["name"];
                } else {
                  itemLang = item.attributes.attributes["language"];
                }
                // Initialize lang. in new group.
                if (!this.audioSegments[audioGroupId][itemLang]) {
                  this.audioSegments[audioGroupId][itemLang] = [];
                }
                return (item = itemLang);
              });

              // # For each lang, find the lang playlist uri and do _loadAudioManifest() on it.
              for (let j = 0; j < audioLanguages.length; j++) {
                let audioLang = audioLanguages[j];
                let audioUri = audioGroupItems[j].attributes.attributes.uri
                if (!audioUri) {
                  //# if mediaItems dont have uris
                  let audioVariant = m3u.items.StreamItem.find((item) => {
                    return !item.attributes.attributes.resolution && item.attributes.attributes["audio"] === audioGroupId;
                  });
                  if (audioVariant) {
                    audioUri = audioVariant.properties.uri;
                  }
                }
                if (audioUri) {
                  let audioManifestUrl = url.resolve(baseUrl, audioUri);
                  if (!audioGroups[audioGroupId]) {
                    audioGroups[audioGroupId] = {};
                  }
                  // # Prevents 'loading' an audio track with same GroupID and LANG.
                  // # otherwise it just would've loaded OVER the latest occurrent of the LANG in GroupID.
                  if (!audioGroups[audioGroupId][audioLang]) {
                    audioGroups[audioGroupId][audioLang] = true;
                    audioManifestPromises.push(this._loadAudioManifest(audioManifestUrl, audioGroupId, audioLang, _injectAudioManifest));
                  }
                }
              }
            }
          }
          return Promise.all(audioManifestPromises);
        }).then(resolve).catch(reject)

      });
      parser.on('error', (err) => {
        reject("Failed to parse M3U8: " + err);
      });
      if (!_injectMasterManifest) {
        fetch(this.masterManifestUri)
          .then(res => {
            res.body.pipe(parser);
          })
          .catch(reject);
      } else {
        _injectMasterManifest().pipe(parser);
      }
    });
  }

  getBandwidths() {
    return this.bandwiths;
  }

  getMediaManifest(bw) {
    return this.playlists[bw].toString();
  }

  getAudioManifest(audioGroupId, lang) {
    if (!this.audioSegments[audioGroupId]) {
      const keygroup = Object.keys(this.audioSegments)
      const audioSegementsGroup = this.audioSegments[keygroup[0]]
      if (!audioSegementsGroup[lang]) {
        const keylang = Object.keys(audioSegementsGroup)
        return audioSegementsGroup[keylang[0]].toString();
      }
      return audioSegementsGroup[lang].toString();
    } else if (!this.audioSegments[audioGroupId][lang]) {
      const keylang = Object.keys(this.audioSegments[audioGroupId])
      return this.audioSegments[audioGroupId][keylang[0]].toString();
    }
    return this.audioSegments[audioGroupId][lang].toString();
  }

  _loadMediaManifest(mediaManifestUri, bandwidth, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        if (!this.playlists[bandwidth]) {
          this.playlists[bandwidth] = m3u;
        }
        let accDuration = 0;
        let prevAccDuration = 0;
        let pos = 0;
        let startPos = 0;

        if (this.startOffset) {
          let accStartOffset = 0;
          m3u.items.PlaylistItem.map((item => {
            if (accStartOffset <= this.startOffset) {
              accStartOffset += item.get('duration');
              startPos++;
            }
          }));
        }

        m3u.items.PlaylistItem.slice(startPos).map((item => {
          if (accDuration <= this.duration) {
            prevAccDuration = accDuration;
            accDuration += item.get('duration');
            pos++;
          }
        }));

        // Logic to find the nearest segment in time:
        // At this stage accDuration is greater than the target duration.
        // If not closer to the target than prevAccDuration, step back a segment.
        if ((accDuration - this.duration) >= (this.duration - prevAccDuration) && pos > 1) {
          pos--;
          accDuration = prevAccDuration;
        }

        this.durationAudio = this.durationAudio === 0 ? accDuration : this.durationAudio;

        this.playlists[bandwidth].items.PlaylistItem = m3u.items.PlaylistItem.slice(startPos, startPos + pos);
        resolve();
      });
      parser.on('error', (err) => {
        reject("Failed to parse M3U8: " + err);
      });
      if (!_injectMediaManifest) {
        fetch(mediaManifestUri)
          .then(res => {
            res.body.pipe(parser);
          })
          .catch(reject);
      } else {
        _injectMediaManifest(bandwidth).pipe(parser);
      }
    });
  }
  _loadAudioManifest(audioManifestUri, audioGroupId, audioLang, _injectAudioManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();


      parser.on('m3u', m3u => {
        if (!this.audioSegments[audioGroupId][audioLang].length) {
          this.audioSegments[audioGroupId][audioLang] = m3u;
        }
        let accDuration = 0;
        let prevAccDuration = 0;
        let pos = 0;

        m3u.items.PlaylistItem.map((item => {
          if (accDuration <= this.durationAudio) {
            prevAccDuration = accDuration;
            accDuration += item.get('duration');
            pos++;
          }
        }));

        // Logic to find the nearest segment in time:
        // At this stage accDuration is greater than the target duration.
        // If not closer to the target than prevAccDuration, step back a segment.
        if (this._similarSegItemDuration() && (accDuration - this.durationAudio) >= (this.durationAudio - prevAccDuration) && pos > 1) {
          pos--;
        }
        this.audioSegments[audioGroupId][audioLang].items.PlaylistItem = m3u.items.PlaylistItem.slice(0, pos);
        resolve();
      });
      parser.on('error', (err) => {
        reject("Failed to parse M3U8: " + err);
      });
      if (!_injectAudioManifest) {
        fetch(audioManifestUri)
          .then(res => {
            res.body.pipe(parser);
          })
          .catch(reject);
      } else {
        _injectAudioManifest(audioGroupId).pipe(parser);
      }
    });
  }

  _similarSegItemDuration() {
    const groups = Object.keys(this.audioSegments);
    if (groups.length === 0) {
      return true;
    }
    const langs = Object.keys(this.audioSegments[groups[0]]);
    if (langs.length === 0) {
      return true;
    }
    const audioSegList = this.audioSegments[groups[0]][langs[0]].items.PlaylistItem;
    let totalAudioDuration = 0;
    let audioCount = 0;
    audioSegList.map(seg => {
      if (seg.get("duration")) {
        audioCount++;
        totalAudioDuration += seg.get("duration");
      }
    })
    const avgAudioDuration = totalAudioDuration / audioCount;

    const bandwidths = Object.keys(this.playlists);
    if (bandwidths.length === 0) {
      return true;
    }
    const videoSegList = this.playlists[bandwidths[0]].items.PlaylistItem;
    let totalVideoDuration = 0;
    let videoCount = 0;
    videoSegList.map(seg => {
      if (seg.get("duration")) {
        videoCount++;
        totalVideoDuration += seg.get("duration");
      }
    })
    const avgVideoDuration = totalVideoDuration / videoCount;

    const diff = Math.abs(avgVideoDuration - avgAudioDuration);
    if (diff > 0.250) {
      return false;
    }
    return true;
  }

}

module.exports = HLSTruncateVod;