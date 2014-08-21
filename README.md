pixiv_ugoira_gif
================

INTRODUCTION

Creates a button which allows to generate an animated GIF from an ugoira animation hosted on pixiv.

It requires a javascript code injector like Greasemonkey for Firefox or Tampermonkey for Chrome. I haven't tested it in another browsers nor plugins/methods.

This library uses [jsgif](https://github.com/antimatter15/jsgif) for GIF encoding.

INSTALLATION

All you've got to do is add the contents of "pixiv_ugoira_gif.js" to the disired javascript injector and that's it! If you use Greasemonkey/Tampermonkey, the script will only run when navigating pixiv.com or pixiv.net.

USAGE

The library adds dinamically the following buttons:

- Create GIF!.- This button is shown when all frames of the animation are loaded. It processes the frames one by one without the need of server-side scripts at all.

- Download ZIP!.- This button is shown once the page is loaded. It starts the download of the ZIP package from pixiv. This package is loaded by the pixiv player for the original animation.

- View GIF!.- This button is shown once the frames are processed (clicking the "Create GIF!" button). It displays the resulting GIF overlayed on the page.

- Download GIF!.- This button is shown once the frames are processed (clicking the "Create GIF!" button). It shows the browser's "save file" dialog in order to save the resulting GIF. It's recommended to use this feature to save the GIF because it uses the name of the work id for the file instead of prompting to the user for the filename.

WARNINGS AND NOTES

As this is an experimental library, it may be unstable and buggy, so if you find any issue with it please provide feedback in order to improve it.

This library may cause significant performance issues in your browser when is used to convert large animations (length and/or size). Sometimes the browser stops a little, but in the end the resulting GIF is shown, so please BE PATIENT!

DISCLAIMER

This library comes with NO WARRANTY at all so USE IT AT YOUR OWN RISK.
