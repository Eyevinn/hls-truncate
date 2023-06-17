import m3u8, { M3U, M3UParser } from '@eyevinn/m3u8';
import fetch, { Response } from 'node-fetch';

interface PlaylistMap {
  [bw: string]: M3U;
}

interface AudioLangMap {
  [audioLang: string]: M3U;
}

interface AudioSegMap {
  [audioGroupId: string]: AudioLangMap;
}

export default class HLSTruncateVod {
  private masterManifestUri: string;
  private duration: number;
  private durationAudio = 0;
  private playlists: PlaylistMap = {};
  private bandwidths: string[] = [];
  private audioSegments: AudioSegMap = {};
  private m3u: M3U | undefined;

  constructor(vodManifestUri: string, duration: number) {
    this.masterManifestUri = vodManifestUri;
    this.duration = duration;
    this.durationAudio = 0;
  }

  load(_injectMasterManifest?, _injectMediaManifest?, _injectAudioManifest?): Promise<void> {
    return new Promise((resolve, reject) => {
      const parser: M3UParser = m3u8.createStream();

      parser.on('m3u', (m3u: M3U) => {
        this.m3u = m3u;
        let mediaManifestPromises = [];
        let audioManifestPromises = [];
        let baseUrl = '';
        let audioGroups = {};
        const m = this.masterManifestUri.match(/^(.*)\/.*?$/);
        if (m) {
          baseUrl = m[1] + '/';
        }

        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];
          this.bandwidths.push(streamItem.get('bandwidth'));
          const mediaManifestUrl = (new URL(streamItem.get('uri'), baseUrl)).toString();
          if (!m3u.items.MediaItem.find((mediaItem) => mediaItem.get("type") === "AUDIO" && mediaItem.get("uri") == streamItem.get("uri"))) {
            mediaManifestPromises.push(this._loadMediaManifest(mediaManifestUrl, streamItem.get('bandwidth'), _injectMediaManifest));
          }
        }

        Promise.all(mediaManifestPromises).then(() => {
          for (let i = 0; i < m3u.items.StreamItem.length; i++) {
            const streamItem = m3u.items.StreamItem[i];
            if (streamItem.get("audio")) {
              let audioGroupId = streamItem.get("audio");
              if (!this.audioSegments[audioGroupId]) {
                this.audioSegments[audioGroupId] = {};
              }

              let audioGroupItems = m3u.items.MediaItem.filter((item) => {
                return item.get('type') === "AUDIO" && item.get("group-id") === audioGroupId;
              });
              // # Find all langs amongst the mediaItems that have this group id.
              // # It extracts each mediaItems language attribute value.
              // # ALSO initialize in this.audioSegments a lang. property whos value is an array [{seg1}, {seg2}, ...].
              let audioLanguages = audioGroupItems.map((item) => {
                let itemLang;
                if (!item.get("language")) {
                  itemLang = item.get("name");
                } else {
                  itemLang = item.get("language");
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
      });
    });
  }
}