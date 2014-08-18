pixiv_ugoira_gif
================

INTRODUCTION

Creates a button which allows to create an animated GIF from ugoira animations hosted on pixiv.

It requires a javascript code injector like Greasemonkey for Firefox or Tampermonkey for Chrome. I haven't tested it in another browsers nor plugins/methods.

As this is an experimental library, it may be unstable and buggy, so if you find any issue with it please provide feedback in order to improve it.

This library uses [jsgif](https://github.com/antimatter15/jsgif) for GIF encoding. So actually the real job I made was only extracting the info from pixiv to feed the encoder with it and dinamically adding elements to the pixiv UI.

I want to thank to the creators of jsgif for they effort, which made possible this library.

USAGE

All you've got to do is add the script to the disired javascript injector and that's it! If you use Greasemonkey/Tampermonkey, the script will only run when navigating pixiv.com or pixiv.net. You're gonna see the "Create GIF!" button the moment all frames of the animation are loaded. Once you click that button, the animation is processed frame by frame without the need of server-side scripts at all. The resulting GIF is shown in a layer over the UI, where you can use the common browser options for save it.

Warning: This library may cause significant performance issues in your browser when is used to convert large animations (length and/or size). Sometimes the browser stops a little, but in the end the resulting GIF is shown, so please BE PATIENT!

Note: In Chrome it may be needed to add the ".gif" extension when saving.

This library comes with NO WARRANTY at all so USE IT AT YOUR OWN RISK.
