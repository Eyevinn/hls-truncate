const m3u8 = require('@eyevinn/m3u8');
const fetch = require('node-fetch');
const url = require('url');

class HLSTruncateVod {
  constructor(vodManifestUri, duration, options) {
    this.masterManifestUri = vodManifestUri;
    this.playlistsVideo = {};
    this.duration = duration;
    this.durationAudio = 0;
    this.startVideoOffset = 0;
    this.removedDurationFromStartVideo = 0;
    this.bandwiths = [];
    this.playlistsAudio = {};
    this.playlistsSubtitles = {};
    if (options && options.offset) {
      this.startOffset = options.offset;
    }
  }

  load(_injectMasterManifest, _injectMediaManifest, _injectAudioManifest, _injectSubtitleManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        this.m3u = m3u;
        let videoManifestData = [];
        let audioManifestData = [];
        let subtitleManifestData = [];
        let baseUrl;
        const m = this.masterManifestUri.match(/^(.*)\/.*?$/);
        if (m) {
          baseUrl = m[1] + '/';
        }

        // Collect information about manifests but don't start loading them yet
        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];
          this.bandwiths.push(streamItem.get('bandwidth'));
          const manifestUrlVideo = url.resolve(baseUrl, streamItem.get('uri'));
          if (!m3u.items.MediaItem.find((mediaItem) => mediaItem.get("type") === "AUDIO" && mediaItem.get("uri") == streamItem.get("uri"))) {
            videoManifestData.push({
              url: manifestUrlVideo,
              bandwidth: streamItem.get('bandwidth')
            });
          } 
        }
        
        if (m3u.items.MediaItem.length > 0) {
          for (let i = 0; i < m3u.items.MediaItem.length; i++) {
            const mediaItem = m3u.items.MediaItem[i];
            if (mediaItem.get("type") === "AUDIO") {
              const groupId = mediaItem.get("group-id");
              const lang = mediaItem.get("language") || mediaItem.get("name");
              const variantKey = this._getMediaVariantKey(groupId, lang);
              const manifestUrlAudio = url.resolve(baseUrl, mediaItem.get("uri"));
              audioManifestData.push({
                url: manifestUrlAudio,
                variantKey: variantKey
              });
            } else if (mediaItem.get("type") === "SUBTITLES") {
              const groupId = mediaItem.get("group-id");
              const lang = mediaItem.get("language") || mediaItem.get("name");
              const variantKey = this._getMediaVariantKey(groupId, lang);
              const manifestUrlSubtitles = url.resolve(baseUrl, mediaItem.get("uri"));
              subtitleManifestData.push({
                url: manifestUrlSubtitles,
                variantKey: variantKey
              });
            }
          }
        }

        // Process manifests in strict sequence
        const loadVideoManifests = () => {
          return Promise.all(videoManifestData.map(data => 
            this._loadMediaManifest(data.url, data.bandwidth, _injectMediaManifest)
          ));
        };

        const loadAudioManifests = () => {
          return Promise.all(audioManifestData.map(data => 
            this._loadAudioManifest(data.url, data.variantKey, _injectAudioManifest)
          ));
        };

        const loadSubtitleManifests = () => {
          return Promise.all(subtitleManifestData.map(data => 
            this._loadSubtitleManifest(data.url, data.variantKey, _injectSubtitleManifest)
          ));
        };

        // Execute in strict sequence
        loadVideoManifests()
          .then(() => loadAudioManifests())
          .then(() => loadSubtitleManifests())
          .then(() => {
            resolve();
          })
          .catch(reject);
      });
      parser.on('error', (err) => {
        reject("[hls-truncate]: Failed to parse M3U8: " + err);
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

  getAudioGroupIds() {
    const variantKeys = Object.keys(this.playlistsAudio);
    return variantKeys.map(variantKey => this._getGroupAndLanguageFromVariantKey(variantKey).groupId);
  }

  getAudioLanguagesForGroupId(audioGroupId) {
    const variantKeys = Object.keys(this.playlistsAudio);
    return variantKeys
      .filter(variantKey => {
        const variant = this._getGroupAndLanguageFromVariantKey(variantKey);
        return variant.groupId === audioGroupId;
      })
      .map(variantKey => {
        const variant = this._getGroupAndLanguageFromVariantKey(variantKey);
        return variant.lang;
      });
  }

  getAudioVariantKeys() {
    return Object.keys(this.playlistsAudio);
  }

  getMediaManifest(bw) {
    return this.playlistsVideo[bw].toString();
  }

  getAudioManifest(audioGroupId, lang) {
    const variantKeys = Object.keys(this.playlistsAudio);
    if (variantKeys.length === 0) {
      return null;
    }
    const desiredVariantKey = this._getMediaVariantKey(audioGroupId, lang);
    // CASE: no perfect match for desired groupId and lang
    if (!this.playlistsAudio[desiredVariantKey]) {
      // If the desired variant key is not found, we need to find the closest variant key.
      // find all variantkeys that match the audioGroupId
      const matchingVariantKeys = variantKeys.filter(variantKey => {
        const variant = this._getGroupAndLanguageFromVariantKey(variantKey);
        return variant.groupId === audioGroupId;
      });
      // in not variantkeys matched then just take the first one
      if (matchingVariantKeys.length === 0) {
        matchingVariantKeys.push(variantKeys[0]);
      }
      // for all matching variant keys, find the one that matches the lang
      const matchingVariantKeysWithLang = matchingVariantKeys.filter(variantKey => {
        const variant = this._getGroupAndLanguageFromVariantKey(variantKey);
        return variant.lang === lang;
      });
      // if there are no matching variant keys with lang then just take the first one
      if (matchingVariantKeysWithLang.length === 0) {
        matchingVariantKeysWithLang.push(matchingVariantKeys[0]);
      }
      // return the first matching variant key with lang
      return this.playlistsAudio[matchingVariantKeysWithLang[0]].toString();  
    }
    // CASE: perfect match for desired groupId and lang
    return this.playlistsAudio[desiredVariantKey].toString();
  }

  getSubtitleManifest(subtitleGroupId, lang) {
    const variantKeys = Object.keys(this.playlistsSubtitles);
    if (variantKeys.length === 0) {
      return null;
    }
    const desiredVariantKey = this._getMediaVariantKey(subtitleGroupId, lang);
    // CASE: no perfect match for desired groupId and lang
    if (!this.playlistsSubtitles[desiredVariantKey]) {
      // find all variantkeys that match the subtitleGroupId
      const matchingVariantKeys = variantKeys.filter(variantKey => {
        const variant = this._getGroupAndLanguageFromVariantKey(variantKey);
        return variant.groupId === subtitleGroupId;
      });
      // if no variantkeys matched then just take the first one
      if (matchingVariantKeys.length === 0) {
        matchingVariantKeys.push(variantKeys[0]);
      }
      // for all matching variant keys, find the one that matches the lang
      const matchingVariantKeysWithLang = matchingVariantKeys.filter(variantKey => {
        const variant = this._getGroupAndLanguageFromVariantKey(variantKey);
        return variant.lang === lang;
      });
      // if there are no matching variant keys with lang then just take the first one
      if (matchingVariantKeysWithLang.length === 0) {
        matchingVariantKeysWithLang.push(matchingVariantKeys[0]);
      }
      // return the first matching variant key with lang
      return this.playlistsSubtitles[matchingVariantKeysWithLang[0]].toString();
    }
    // CASE: perfect match for desired groupId and lang
    return this.playlistsSubtitles[desiredVariantKey].toString();
  }

  getSubtitleLanguagesForGroupId(subtitleGroupId) { 
    const variantKeys = Object.keys(this.playlistsSubtitles);
    return variantKeys
      .filter(variantKey => {
        const variant = this._getGroupAndLanguageFromVariantKey(variantKey);
        return variant.groupId === subtitleGroupId;
      })
      .map(variantKey => {
        const variant = this._getGroupAndLanguageFromVariantKey(variantKey);
        return variant.lang;
      });
  }

  getSubtitleGroupIds() {
    const variantKeys = Object.keys(this.playlistsSubtitles);
    return variantKeys.map(variantKey => this._getGroupAndLanguageFromVariantKey(variantKey).groupId);
  }

  _getMediaVariantKey(groupId, lang) {
    // Here we create a single key for each media item.
    // We combine them to one key so that iterating over the groups and languages is easier.
    // NOTE: we might need to add support for media item codec in the future, not just groupId and lang.
    return `${groupId}%%%${lang}`;
  }

  _getGroupAndLanguageFromVariantKey(variantKey) {
    const [groupId, lang] = variantKey.split("%%%");
    return { groupId, lang };
  }

  _similarSegItemDuration() {
    // get list of groupIds
    const groupIds = this.getAudioGroupIds();
    if (groupIds.length === 0) {
      return true;
    }
    // get list of langs for first groupId
    const langs = this.getAudioLanguagesForGroupId(groupIds[0]);
    if (langs.length === 0) {
      return true;
    }
    // get the seg list  from the frist audio variant key    
    const variantKeys = this.getAudioVariantKeys();
    const audioSegList = this.playlistsAudio[variantKeys[0]].items.PlaylistItem;
    let totalAudioDuration = 0;
    let audioCount = 0;
    audioSegList.map(seg => {
      if (seg.get("duration")) {
        audioCount++;
        totalAudioDuration += seg.get("duration");
      }
    })
    const avgAudioDuration = totalAudioDuration / audioCount;

    const bandwidths = Object.keys(this.playlistsVideo);
    if (bandwidths.length === 0) {
      return true;
    }
    const videoSegList = this.playlistsVideo[bandwidths[0]].items.PlaylistItem;
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

  _loadMediaManifest(mediaManifestUri, bandwidth, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        if (!this.playlistsVideo[bandwidth]) {
          this.playlistsVideo[bandwidth] = m3u;
        }
        let accDuration = 0;
        let prevAccDuration = 0;
        let pos = 0;
        let startPos = 0;

        if (this.startOffset) {
          let accStartOffset = 0;
          m3u.items.PlaylistItem.map((item => {
            if (accStartOffset + item.get('duration') <= this.startOffset) {
              accStartOffset += item.get('duration');
              startPos++;
            }
          }));

          this.startVideoOffset = this.startVideoOffset === 0 ? accStartOffset : this.startVideoOffset;
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

        let totalDuration = 0;
        m3u.items.PlaylistItem.forEach((item,index) => {
          if (index < startPos) {
            totalDuration += item.get("duration");
          }
        });
        this.removedDurationFromStartVideo = totalDuration;

        this.playlistsVideo[bandwidth].items.PlaylistItem = m3u.items.PlaylistItem.slice(startPos, startPos + pos);
        resolve();
      });
      parser.on('error', (err) => {
        reject("[hls-truncate]: Failed to parse M3U8: " + err);
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

  _loadAudioManifest(audioManifestUri, variantKey, _injectAudioManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();
      parser.on('m3u', m3u => {
        if (!this.playlistsAudio[variantKey]) {
          this.playlistsAudio[variantKey] = m3u;
        }
        let accDuration = 0;
        let prevAccDuration = 0;
        let pos = 0;
        let startPos = 0;

        if (this.startOffset) {
          let accStartOffset = 0;
          for (let i = 0; i < m3u.items.PlaylistItem.length; i++) {
            const pli = m3u.items.PlaylistItem[i];
            accStartOffset += pli.get('duration');
            if (accStartOffset <= this.removedDurationFromStartVideo) {
              startPos++;
            } else {
              break;
            }
          }
        }

        m3u.items.PlaylistItem.slice(startPos).map((item => {
          if (accDuration <= this.durationAudio) {
            prevAccDuration = accDuration;
            accDuration += item.get('duration');
            pos++;
          }
        }));

        // Modified logic to ensure audio duration is >= video duration
        // Only step back if we have similar segment durations AND
        // stepping back would still leave us with enough audio
        if (this._similarSegItemDuration() && 
            (accDuration - this.durationAudio) >= (this.durationAudio - prevAccDuration) && 
            pos > 1 && 
            prevAccDuration >= this.durationAudio) {
          pos--;
          accDuration = prevAccDuration;
        }
        
        // If we're still short on audio, add one more segment if available
        if (accDuration < this.durationAudio && 
            startPos + pos < m3u.items.PlaylistItem.length) {
          pos++;
        }
        
        this.playlistsAudio[variantKey].items.PlaylistItem = m3u.items.PlaylistItem.slice(startPos, startPos + pos);
        resolve();
      });
      parser.on('error', (err) => {
        reject("[hls-truncate]: Failed to parse M3U8: " + err);
      });
      if (!_injectAudioManifest) {
        fetch(audioManifestUri)
          .then(res => {
            res.body.pipe(parser);
          })
          .catch(reject);
      } else {
        _injectAudioManifest(variantKey).pipe(parser);
      }
    });
  }

  _loadSubtitleManifest(subtitleManifestUri, variantKey, _injectSubtitleManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        if (!this.playlistsSubtitles[variantKey]) {
          this.playlistsSubtitles[variantKey] = m3u;
        }
        let accDuration = 0;
        let prevAccDuration = 0;
        let pos = 0;
        let startPos = 0;

        if (this.startOffset) {
          let accStartOffset = 0;
          for (let i = 0; i < m3u.items.PlaylistItem.length; i++) {
            const pli = m3u.items.PlaylistItem[i];
            accStartOffset += pli.get('duration');
            if (accStartOffset <= this.removedDurationFromStartVideo) {
              startPos++;
            } else {
              break;
            }
          }
        }

        // Use the video duration (this.duration) as reference for subtitles
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
        }
        
        this.playlistsSubtitles[variantKey].items.PlaylistItem = m3u.items.PlaylistItem.slice(startPos, startPos + pos);
        resolve();
      });

      parser.on('error', (err) => {
        reject("[hls-truncate]: Failed to parse M3U8: " + err);
      });

      if (!_injectSubtitleManifest) {
        fetch(subtitleManifestUri)
          .then(res => {
            res.body.pipe(parser);
          })
          .catch(reject);
      } else {
        _injectSubtitleManifest(variantKey).pipe(parser);
      }
    });
  }

}

module.exports = HLSTruncateVod;