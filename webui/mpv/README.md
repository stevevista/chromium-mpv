```html
<x-video>
</x-video>
```

# Attributes
 - enable-key  whether using key-binding. default is false
 - enable-crop whether enable cropping usung mouse dragging. default is false
 - show-info show media meta info info in left-top area. default is false
 - control show media control bar on the bottom. default is false
 - auto-hide-control whether hide control bar when mouse out of element or not moving. default is true
 - show-toggle show toggle play/pause on the center of element. default is true
 - src='' playing url. can alose be set by object.load(url)
 - mute 
 - disable-audio different from mute, this attribute remove audio track from media.
 - locale='' select language to show subtitle or AI info.
 - ai-switch='' ai filter.
 - screenshot-directory='' where to save screenshot.
 - screenshot-format='' screenshot pic save format.
 - online-detection enable local object detection.
 - hwaccel='auto' select hardware decode accelator.
 - transport='tcp/udp' for rtsp transport.
 - video-sync='audio' video sync type.

# Methods

- load
- screenshot
- togglePlay
- property
- option
- command
- seekPercent
- seek
- stop
- crop({ left, top, width, height } || null)
