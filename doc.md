requesturl:
   attend un string forcément OU un ArrayBuffer
   Ne gère pas nativement le FormData
   Ne gère pas automatiquement le multipart/form-data
PicGo :
   Gère nativement les uploads d'images
   A sa propre logique de requête HTTP
   Contourne les limitations d'Obsidian en utilisant son propre système d'upload


## API Cloudflare Images

   il y a deux méthodes :

   ### Direct Upload :
   ```http
   POST /client/v4/accounts/{account_id}/images/v1
   Content-Type: multipart/form-data

   file=@/path/to/image.png
   ```

   ### Base64 Upload :
   ```http
   POST /client/v4/accounts/{account_id}/images/v1
   Content-Type: application/json

   {
   "file": {
      "content": "iVBORw0KGgoAAAANSUhEUgAA...",
      "name": "example.jpg"
   }
   }
   ```

## CORS

   pas d'erreur CORS avec `requestUrl` d'Obsidian car :

   1. `requestUrl` est fourni par Obsidian qui est une application Electron
   2. Electron n'est pas soumis aux restrictions CORS comme un navigateur
   3. C'est pour ça qu'Obsidian fournit cette API, pour contourner les limitations du navigateur

   C'est un des avantages d'utiliser `requestUrl` d'Obsidian plutôt que `fetch` du navigateur :
   - Pas de problèmes CORS
   - Accès direct aux APIs externes
   - Possibilité d'envoyer des requêtes à n'importe quel domaine

## multiformdata

   Le format `multipart/form-data` est juste un format de texte spécifique qui suit cette structure :
   ```
   --boundary
   Content-Disposition: form-data; name="file"; filename="image.png"
   Content-Type: image/png

   [données binaires]
   --boundary--
   ```


   nous voulons envoyer :
   - Le fichier image (données binaires)
   - Le nom du fichier
   - La description alt
   - Et potentiellement d'autres métadonnées

   C'est exactement pour ça que le format `multipart/form-data` existe! Il permet d'envoyer :
   1. Des données textuelles (nom, description, etc.)
   2. Des fichiers binaires
   3. Le tout dans une même requête

   Par exemple, en format `multipart/form-data` ça ressemblerait à :
   ```
   --boundary
   Content-Disposition: form-data; name="file"; filename="image.png"
   Content-Type: image/png

   [données binaires de l'image]
   --boundary
   Content-Disposition: form-data; name="description"

   Ceci est une belle image
   --boundary
   Content-Disposition: form-data; name="alt"

   Description alternative de l'image
   --boundary--
   ```

   Donc nous DEVONS utiliser `multipart/form-data` pour notre cas d'usage. Et c'est POSSIBLE avec `requestUrl` d'Obsidian puisqu'il accepte des strings. Nous devons juste construire manuellement ce format.



   3. Donc techniquement, nous POUVONS :
      - Créer manuellement cette chaîne de texte
      - Insérer les données binaires du fichier
      - Envoyer le tout via `requestUrl`

   C'est exactement ce que fait un navigateur quand il envoie un `FormData`. Il crée juste ce format texte spécifique.

## form

   `FormData` est un objet JavaScript qui permet de construire facilement un ensemble de paires clé/valeur pour envoyer des données dans une requête HTTP. Il est particulièrement utile pour :
   - Envoyer des fichiers
   - Simuler la soumission d'un formulaire HTML
   - Envoyer des données structurées

   `multipart/form-data` est un type de contenu HTTP qui permet d'envoyer :
   - Des fichiers
   - Des données de formulaire
   - Un mélange de données textuelles et binaires

   Voici un exemple simple :
   ```html
   <form method="post" enctype="multipart/form-data">
   <input type="file" name="image">
   <input type="text" name="title">
   </form>
   ```

   Quand ce formulaire est envoyé, le navigateur crée une requête qui ressemble à :
   ```
   POST /upload HTTP/1.1
   Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryABC123

   ------WebKitFormBoundaryABC123
   Content-Disposition: form-data; name="image"; filename="photo.jpg"
   Content-Type: image/jpeg

   [Données binaires de l'image]
   ------WebKitFormBoundaryABC123
   Content-Disposition: form-data; name="title"

   Mon titre
   ------WebKitFormBoundaryABC123--
   ```
### boundary

   Le `boundary` est un séparateur unique qui permet de délimiter les différentes parties d'une requête `multipart/form-data`. 

   Imaginez que vous envoyez plusieurs choses dans une même requête :
   - Un fichier image
   - Un titre
   - Une description

   Le `boundary` agit comme une "frontière" (d'où son nom) entre ces différentes parties. Par exemple :

   ```text
   ------WebKitFormBoundaryABC123   <-- C'est le boundary
   Content-Disposition: form-data; name="image"
   Content-Type: image/jpeg

   [Données de l'image]
   ------WebKitFormBoundaryABC123   <-- Encore le boundary pour séparer
   Content-Disposition: form-data; name="title"

   Mon Titre
   ------WebKitFormBoundaryABC123   <-- Et encore pour la dernière partie
   Content-Disposition: form-data; name="description"

   Ma description
   ------WebKitFormBoundaryABC123-- <-- Le boundary final avec "--" pour indiquer la fin
   ```

   Le `boundary` doit être :
   1. Unique (pour ne pas confondre avec le contenu)
   2. Spécifié dans le header `Content-Type`
   3. Ne jamais apparaître dans le contenu des données

   C'est pour ça que souvent on voit des boundaries comme :
   ```text
   ----WebKitFormBoundary + caractères aléatoires
   ```

   Dans notre cas avec Obsidian, la difficulté est que `requestUrl` ne gère pas nativement ce format, d'où l'idée d'utiliser PicGo qui sait gérer tout ça correctement.

## instructions

aller dans https://dash.cloudflare.com/b805cca6c486d78d68e7a4498292be56/images/plans?configure=false et s"abonner au service

## roadmap

J'aimerais aussi qu'on ajoute un section de paramètre lié à l'affichage de l'image : taille par défaut, boolean modifier la taille avec alt + scroll
bouton pour copier l'image, bouton pour renommer (et alt ?)


 dans le worker qui fonctionne, le fichier est envoyé directement comme corps de la requête, sans FormData ni ArrayBuffer. Essayons cette approche :

 h oui, vous avez raison ! En fait, il y a deux approches possibles avec Cloudflare Images :
Upload direct vers l'API Cloudflare Images
Upload via un Worker Cloudflare (qui fait ensuite l'upload vers Cloudflare Images)
L'approche avec le Worker est souvent utilisée pour ajouter une couche de sécurité supplémentaire, car elle permet de :
Ne pas exposer le token Cloudflare directement dans le frontend
Ajouter des validations supplémentaires
Gérer des transformations avant l'upload
Mais vous avez raison, on peut aussi utiliser l'API Cloudflare Images directement. Regardons la documentation officielle pour l'upload direct :



 Le processus se fait maintenant en deux étapes :
On demande d'abord une URL d'upload direct à Cloudflare
On utilise cette URL pour uploader le fichier
Cette approche est plus sécurisée et plus fiable car :
Elle utilise l'API officielle de Direct Upload (v2)
Elle permet de gérer les gros fichiers
Elle gère automatiquement les timeouts et les retries
Elle permet d'ajouter des métadonnées au fichier
Essayez maintenant d'uploader une image, cela devrait fonctionner correctement.


La seule différence est que dans notre cas, nous devons convertir le File en ArrayBuffer car requestUrl d'Obsidian ne peut pas gérer directement un File comme corps de la requête.


## Picgo



PicGo est un outil spécialisé pour l'upload d'images qui offre :

1. **Fonctionnalités principales** :
   - Upload d'images vers différents services (Cloudflare, Imgur, S3, etc.)
   - Gestion des erreurs et retries
   - Support de multiples formats d'images
   - Transformation d'images

2. **Deux versions** :
   - PicGo (GUI) : Application desktop avec interface graphique
   - PicGo-core : Version Node.js utilisable comme bibliothèque

3. **Avantages pour Obsidian** :
   - Gère automatiquement les problèmes de CORS
   - Compatible avec l'environnement Electron
   - Supporte de nombreux services d'hébergement
   - Communauté active et nombreux plugins

4. **Services supportés** :
   - Cloudflare Images
   - GitHub
   - Imgur
   - S3
   - Azure
   - Et bien d'autres...

C'est une solution populaire dans l'écosystème Obsidian car elle résout beaucoup de problèmes techniques (comme le CORS) que nous rencontrons actuellement.

Voulez-vous que nous l'intégrions dans notre plugin ?

Je vois que vous voulez comprendre comment le plugin utilise PicGo. Voici ce que j'ai trouvé :

Le plugin utilise PicGo-core, qui est une version Node.js de PicGo. L'avantage de PicGo est qu'il :

1. Gère nativement les problèmes de CORS
2. Supporte de nombreux services d'hébergement d'images
3. Fonctionne bien dans l'environnement Electron d'Obsidian

Pour l'utiliser dans notre plugin, nous devrions :

1. Installer PicGo-core :
```typescript
import picgo from 'picgo'
```

2. Configurer l'uploader :
```typescript
const PicGo = new picgo()
PicGo.setConfig({
  'picBed': {
    'uploader': 'cloudflare',
    'cloudflare': {
      'token': settings.imagesToken,
      'accountId': settings.accountId
    }
  }
})
```

3. Utiliser pour l'upload :
```typescript
const result = await PicGo.upload([file])
```

Voulez-vous que j'implémente cette solution avec PicGo dans notre service CloudflareMediaService ?
## roadmap

### toolkit
 
####  obsidian://show-plugin?id=obsidian-image-toolkit


When you click an image, it will be popped up and you can preview, zoom, move, rotate, flip, invert and copy the image.


Zoom in or out an image by mouse wheel or clicking toolbar zoom icons
Move an image by dragging mouse cursor or pressing keyboard arrow keys
Preview an image in full-screen mode
Rotate or flip an image by clicking footer toolbar icons
Invert the color of an image
Copy an image
Rule:

After clicking the image, the image will be popped up with transparent mask layer on the background
You can only click and preview one image at a time
You cannot edit and look through your notes, or other operations except to view and operate the image in the Normal Mode
Gallery Navbar:

All the images in the current note will be displayed at the bottom, and you can switch these thumbs to view any image
To be able to use this functionality, you need to turn on 'display gallery navbar' on the plugin settings page
The background color of the gallery navbar and the border color the selected image can be set on the plugin settings page
Exit:

Click the outside of the image
Press Esc
If it's in full-screen mode, you need to exit full-screen mode firstly, then exit the image preview page and close popup layer.

Move the image:

Put your mouse cursor on the image, and directly drag the image to move
Press configured arrow keys to move the image
If you set modifier keys (Ctrl, Alt, Shift) for moving the image, you need to hold the modifier keys and press arrow keys at the same time.

Pin Mode
When you turn on 'Pin an image' on the settings page, it's in Pin Mode.

pin_mode_screenshot

Rule:

You can click and popped up 1 to 5 images at a time
Comparing with normal mode, the image will be popped up without mask layer after clicking the image
It's allowed to edit and look through your notes while images are being popped up and previewed
Menu:

When you right click on the popped image, it will show the menu at the right side of your cursor. The menu contains several functions, like zoom, full screen, refresh, rotate, flip, copy, close, etc.
Exit:

Press Esc to close the image where your mouse cursor is hovering
click 'close' button in the menu
Move the image:

Put your mouse cursor on the image, and directly drag the image to move

#### text extractor
obsidian://show-plugin?id=text-extractor
#### image auto upload

Obsidian Image Auto Upload Plugin
This is a tool that supports uploading images to image beds using PicGo, PicList, and PicGo-Core.
Remember to restart Obsidian after updating the plugin.

Not tested on Mac

Start
Install the PicGo tool and configure it, refer to the official website
Enable PicGo's Server service and remember the port number
Install the plugin
Open the plugin settings and set it to http://127.0.0.1:{{port set in PicGo}}/upload (e.g., http://127.0.0.1:36677/upload)
Try to see if the upload is successful
Set picbed and configName
If you are using PicList (version >= 2.5.3), you can set the picbed and configName through URL parameters.
Example: http://127.0.0.1:36677/upload?picbed=smms&configName=piclist
This will upload the image to the smms picbed and use the piclist configName.
Using this feature, you can upload images to different picbeds in different Obsidian vaults.

Features
Upload when paste image
When you paste an image to Obsidian, this plugin will automatically upload your image.

You can set image-auto-upload: false in frontmatter to control one file.

Supports ".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff", ".webp", ".avif"

Due to the bug in PicGo 2.3.0-beta7, you cannot use this feature. Please install another version of PicGo.

---
image-auto-upload: true
---
Upload all local images file by command
press ctrl+P and input upload all images，enter, then will auto upload all local images

download all internet to local
press ctrl+P and input download all images，enter, then will auto download all internet images to loacl, only test in win10

Upload image by contextMenu
Now you can upload image by contextMenu in edit mode.

Support drag-and-drop
Only work for picgo or picList app.

server mode
You can deploy PicList or PicList-Core in your server and upload to it.

Support PicList 2.6.3 later or PicList-Core1.3.0 later

You can not upload network in this mode.
If you upload fail when you paste img, you can alse try to enable the mode.

Support picgo-core
You can install picgo-core with npm. Reference to doc


#### obsidian://show-plugin?id=mousewheel-image-zoom

mousewheel image zoom

#### clear unused imaegs
obsidian://show-plugin?id=oz-clear-unused-images

Obsidian Plugin for Clearing Unused Images
This plugin helps you to keep your vault clean by deleting the images you are not referencing in your markdown notes anymore.

The plugin simply gets all of your image links from all the markdown documents and compares these images with all image files you have available in your vault.

In case any of these image files are not referenced in any document of the vault, they will be automatically deleted.

Settings
Deleted Image Destination
Please make sure that you select the destination for the deleted images under "Clear Unused Images Settings" tab. You have 3 options:


Move to Obsidian Trash - Files are going to be moved to the .trash under the Obsidian Vault.

Move to System Trash - Files are going to be moved to the Operating System trash.

Permanently Delete - Files are going to be destroyed permanently. You won't beable to revert back.

Excluded Folders
You can exclude folders, from which you don't want images to be removed during the scan. In case there are multiple folders to be excluded, you can divide them by comma. Please ensure you provide the full path in Vault:


You can now exclude all subfolders under the folder paths provided above:


How to use
Activate the plugin from Community Plugins

You can either:

Activate the Ribbon Icon from plugin settings and click Icon from Left Ribbon for running the clean up:

Or use Ribbon Icon or Open Command Palette (Using Ctrl/Cmd + P or from Ribbon) Run "Clear Unused Images".

If you have turned on "Delete Logs" option in plugin settings, you will see a modal popping up with an information which images are deleted from your vault:


In case all images are used, you will see communication as below:


Scanned Image Formats : jpg, jpeg, png, gif, svg, bmp, webp

#### obsidian://show-plugin?id=image-converter
Image Converter for ObsidianMD
Making image management inside Obsidian slightly more convenient.

https://github.com/xRyul/obsidian-image-converter/assets/47340038/63a0646b-29ec-4055-abfc-55d31e07b2f7

Features
Supported image formats: WEBP, JPG, PNG, HEIC, TIF

🖼️ Convert: Automatically convert dropped/pasted images into WEBP, JPG or PNG

🗜️ Compress: Reduce file size by specifying Quality value between 1-100

📏 Resize images (destructive and non-destructive)

Automatically read image dimensions and apply it to the image link e.g.: apply image width to |width or specify any custom size.
Resize by dragging edge of the image, or with Scrollwheel (e.g., CMD+Scrollwheel)


Resize original image (width, height, longest edge, shortest edge, fit, fill)
Align (left, right center) and wrap text around images without any custom syntax in your links:



Image annotation and markup tool. Draw, write, scribble, annotate, markup on top of images right inside Obsidian.







✂️ Crop, rotate, and flip images

<

📁 Custom File Management and Renaming:

Rename: Use variables (e.g., {noteName}, {fileName}) to auto-rename images List of Supported Variables
Output: Organize images into custom output folders with variables.List of Supported Variables
🌍 Pure JavaScript implementation that works completely offline. No external APIs or binary dependencies (such as ImageMagick, Cloudinary, FFmpeg, sharp, etc.) required - keeping it lightweight, portable and secure.

Other
🔄 Batch Processing: Convert, compress, and resize all images in a note or across the entire vault.
🔗 Compatibility with other markdown editors: Ability to have Markdown links for images, and Wiki links for all other links.
🖱️Custom right click context menus:
Copy to clipboard


Copy as Base64 encoded image
Resize original image you have just clicked upon


Delete image from vault - removes image and its link from the vault
📚 Documentation
Settings overview
Basic usage examples
Annotation tool
Crop tool
List of supported variables and use-case examples
How to compress images without quality loss - empirical analysis of image format vs image quality vs file size
How to install
Downlaod main.js, styles.css, manifest.json files from the latest release page.
Creane new folder inside VaultFolder/.obsidian/plugins/ named obsidian-image-converter . If plugins folder doesn't exist, then create it manually.
Move downloaded files into /obsidian-image-converter folder.
Enable the plugin in ObsidianMD.


#### paste img rename

obsidian://show-plugin?id=obsidian-paste-image-rename
Obsidian paste image rename
:loudspeaker: Starting from 1.4.0, Paste image rename becomes a general-purpose renaming plugin
that can handle all attachments added to the vault.

This plugin is inspired by Zettlr, Zettlr shows a prompt that allows the user to rename the image, this is a great help if you want your images to be named and organized clearly.

Zettlr's prompt after pasting an image
Paste image rename plugin not only implements Zettlr's feature, but also allows you to customize how the image name would be generated, and eventually free you from the hassle by automatically renaming the image according to the rules.

Table of Contents

Obsidian paste image rename
How to use
Basic usage
Set imageNameKey frontmatter
Add prefix/suffix to duplicated names
Batch renaming process
Batch rename all images instantly
Handle all attachments
FAQ
Settings
How to use
Basic usage
After installing the plugin, you can just paste an image to any document and the rename prompt will display:

By typing the new name and clicking "Rename" (or just press enter), the image will be renamed and the internal link will be replaced with the new name.

If you set "Image name pattern" to {{fileName}} (it's the default behavior after 1.2.0),
"New name" will be generated as the name of the active file.

Set imageNameKey frontmatter
While adding a lot of images to one document, people possibly want the images to be named in the same format, that's where imageNameKey is useful.

First set a value for imageNameKey in frontmatter:

---
imageNameKey: my-blog
---
Then paste an image, you will notice that the "New name" has already been generated as "my-blog", which is exactly the value of imageNameKey:

You can change the pattern for new name generating by updating the "Image name pattern" value in settings.

For a detailed explanation and other features such as auto renaming, please refer to Settings.

Add prefix/suffix to duplicated names
The plugin will always try to add a prefix/suffix if there's a file of the same name.

Let's continue from the last section and paste the second image, the prompt will still show the new name as "my-blog", now if we just click "Rename", the file will be renamed as "my-blog-1.png", not "my-blog.png":


The -1 suffix is generated according to the default settings:

Because "Duplicate number at start" is false, suffix is used rather than prefix
"Duplicate number delimiter" - is put before the number 1
If we paste the third image without editing the "New name" input, its name will be "my-blog-2.png", the number is increased according to the largest number of "my-blog-?.png" in the attachment directory.

This feature is especially powerful if you enable "Auto rename" in settings, you can just add new images without thinking, and they will be renamed sequentially by the pattern and imageNameKey set.

Batch renaming process
New in 1.3.0

You can use the command "Batch rename embeded files in the current file"
to rename images and other attachments (even notes) in the current file.


The image above demonstrates how to rename all the foo-1.png, foo-2.png… png files
to bar-1-png, bar-2.png… with this feature.

You can also rename the images to the same name, and let the plugin handle
the name deduplication for you. See a video demonstration here:
https://i.imgur.com/6UICugX.mp4

Batch rename all images instantly
New in 1.5.0

The command "Batch rename all images instantly (in the current file)" will
rename all the images in the current file according to
"Image name pattern" in settings.

This is a shortcut for using Batch renaming process with certain arguments,
makes everyday image renaming much easier.

Note that this command has no confirmation, please use it with caution!

Handle all attachments
New in 1.4.0

Paste image rename is not just a plugin for pasted images, it has the potential
to handle all attachments that are added to the vault, no matter whether they are pasted
or dragged.

To use this feature, you need to enable the "Handle all attachments" option in settings.


Additionally, you can configure the "Exclude extension pattern" to ignore files
that match the given extension pattern.

FAQ
Q: I pasted an image but the rename prompt did not show up.

A: This is probably because you are using the Windows system and pasting from a file (i.e. the image is copied from File Explorer, not from a browser or image viewer). In Windows, pasting from a file is like a regular file transfer, the original filename is kept rather than being created and named "Pasted image ..." by Obsidian. You need to turn on "Handle all attachments" in settings to make it work in this situation.

Settings
Image name pattern

The pattern indicates how the new name should be generated.

Available variables:

{{fileName}}: name of the active file, without ".md" extension.
{{imageNameKey}}: this variable is read from the markdown file's frontmatter, from the same key imageNameKey.
{{DATE:$FORMAT}}: use $FORMAT to format the current date, $FORMAT must be a Moment.js format string, e.g. {{DATE:YYYY-MM-DD}}.
Examples

Here are some examples from pattern to image names (repeat in sequence), variables: fileName = "My note", imageNameKey = "foo":

{{fileName}}: My note, My note-1, My note-2
{{imageNameKey}}: foo, foo-1, foo-2
{{imageNameKey}}-{{DATE:YYYYMMDD}}: foo-20220408, foo-20220408-1, foo-20220408-2
Duplicate number at start (or end)

If enabled, the duplicate number will be added at the start as prefix for the image name, otherwise, it will be added at the end as suffix for the image name.

Duplicate number delimiter

The delimiter to generate the number prefix/suffix for duplicated names. For example, if the value is -, the suffix will be like "-1", "-2", "-3", and the prefix will be like "1-", "2-", "3-".

Auto rename

By default, the rename modal will always be shown to confirm before renaming, if this option is set, the image will be auto renamed after pasting.

Handle all attachments

By default, the rename modal will always be shown to confirm before renaming, if this option is set, the image will be auto renamed after pasting.

Exclude extension pattern

This option is only useful when "Handle all attachments" is enabled.
Write a Regex pattern to exclude certain extensions from being handled. Only the first line will be used.

Disable rename notice

Turn off this option if you don't want to see the notice when renaming images.
Note that Obsidian may display a notice when a link has changed, this option cannot disable that.
#### local img plus
obsidian://show-plugin?id=obsidian-local-images-plus
Obsidian Local Images Plus
By using this software, you accept all terms and agree to the license agreement.

The author of this software is not obligated to provide any form of support and assumes no liability.

Obsidian Local Images Plus is a plugin for Obsidian

Main features of the plugin include:
Downloading media files from copied/pasted content of web pages
Localizing media files from copied/pasted content of word / Open Office documents
Saving attachments next to note in folder named after note
Downloading files embedded in markdown tags from web to vault
Saving base64 embedded images to vault
Converting PNG images to JPEG images with various quality
Attachments de-dulication by using MD5 hashing algorithm
Removing orphaned attachments from vault
Installation
Download the latest version from GitHub / GitHub page. Read release notes.
Remove obsidian-local-images plugin to avoid any conflicts.
Extract the archive into your Obsidian vault (e.g. Myvault/.obsidian/plugins)
Restart Obsidian.
Or install from "Obsidian Community Plugins"
Open "Community plugins" dialog and change plugin settings at will.
Enjoy
Updating
Update the plugin from Obsidian settings and restart Obsidian

This plugin has known compatibility issues with the following plugins:

* Paste Image Rename

* Pretty BibTex

Usage
Just copy any web content, Word/Open Office content and paste it into your regular note or a note in canvas.

Starting from version 0.15.0 the plugin also handles all attachments (screenshots/drag-and-drop for files/audio records).

img
Use it in the command/menu mode or in automatic mode (toggle "Automatic processing" option in the settings):

img
img
Localize attachments for the current note (plugin folder) - your active note will be processed and attachments will be saved in the folder preconfigured in the plugin settings.

or

Localize attachments for the current note (Obsidian folder) - your active note will be processed and attachments will be saved in the folder preconfigured in the Obsidian settings.

or

Localize attachments for all your notes (plugin folder) - will be processed all the pages in your vault, that corresponds to Include parameter in the plugin's settings and attachments will be saved in the folder(s) preconfigured in the plugin settings.

NOTE: This plugin can change all your notes at once, so you should consider doing backups of your files periodically.

You can also insert any file e.g:

![mypdf](http://mysite/mypdf.pdf)

![mylocalfile](file:///mylinuxdisk/mysong.mp3)

Files will be copied or downloaded to your attachments folder.

img
NOTE: I would not recommend to use this plugin for copying really big files, since buffered reading from disk not implemented yet.

Starting from version 0.15.6 the plugin also allows you to remove unused attachments by running commands:

Remove all orphaned attachments (Plugin folder)

and

Remove all orphaned attachments (Obsidian folder)

The first one searches orphans in the folder next to the active note, while the second one searches all unused attachments for all your notes. (this requires you to set some root subfolder in Obsidian settings)

Starting from version 0.14.5 attachment names are generated according to MD5, therefore they are pretty unique within the vault.

This means you can place an attachment file anywhere within your vault, replace the absolute path in a tag with the file name and Obsidian will still show it in your note.

Donations
Share your wishes and ideas about this software or buy me a coffee (or hot chocol


#### imgur
obsidian://show-plugin?id=obsidian-imgur-plugin
Installations count
This plugin uploads images to imgur.com instead of storing them locally in your vault.

obsidian-imgur-plugin-demo

Why?
Obsidian stores all the data locally by design
(which is perfect for text and, in my opinion, can be improved for images).
If you often add pictures to your notes, your vault can quickly grow in size.
Which in turn can lead to reaching limits if you use free plans of cloud storage services to sync your notes
or can lead to growth of repository size if you use git to back up your notes.

This plugin is a perfect solution for people
who paste images to their notes on daily basis (i.e. students making screenshots of lecture slides)
and do not want to clutter their vaults with image files.

Having remote images also makes it much easier to share a note with anyone else,
you will only need to share a single file.

If you are uncertain if this solution is for you, you can check out the FAQ section
and/or a video created by @santiyounger discussing pros and cons of this approach

Santi Younger - Use Images Like A Pro

Features
Upload images anonymously or to your Imgur account
Upload images by either pasting from the clipboard or by dragging them from the file system
Animated gifs upload support on drag-and-drop
Installation
Install the plugin via the Community Plugins tab within Obsidian

Getting started
Generating Client ID
For this plugin to work reliably and to avoid hitting daily rate limits from using single shared Client ID,
it was decided that each user should create his own "Client ID". Here are the steps:

If you do not have an Imgur account, you need to get one first - follow https://imgur.com/register
Being authenticated, go to https://api.imgur.com/oauth2/addclient
Use any name for "Application name". For example: "Obsidian Imgur plugin"
Choose "OAuth 2 authorization with a callback URL"
Important: use obsidian://imgur-oauth as an "Authorization callback URL" value
Fill in the "Email" field and proceed to get your Client ID
Configure just received Client ID in Obsidian Imgur plugin settings[1].

After creation, Client ID can be managed at: https://imgur.com/account/settings/apps

Authenticated upload
Go to plugin's settings, select 'Authenticated Imgur upload' and complete authentication.
That's all! Now you are ready to make notes and upload all your images remotely.
You will see all your uploaded images at https://your_login.imgur.com/all/

Anonymous upload
You might not want to see your Obsidian images tied to Imgur account.

For this case there is an 'Anonymous Imgur upload' option.

FAQ
Q: How secure this approach is?
A: Nobody sees your uploaded image unless you share a link or someone magically guesses an URL to your image.

Q: Can I remove a remote image uploaded by accident?
A: For authenticated uploads - yes, go to https://your_login.imgur.com/all/,
for anonymous uploads - no
(it is technically possible, but you will need a deleteHash which is not recorded. I would record it, but there is no place for logging in Obsidian yet)

Q: For how long an image stays at imgur.com? Is there a chance to lose the data?
A: For authenticated uploads, I guess they are never deleted. What about anonymous uploads?
Earlier it was stated on Imgur website that the image you upload stays forever.
I think this is true since 2015. Today I could not find this statement on Imgur website.
I can assume that images that did not receive any view for years, can be removed, but there is nothing to worry about.
You can read my detailed thoughts on this in discussions

Q: Imgur supports videos. Does the plugin support videos upload?
A: No. Initially, I did not consider videos upload support since there is no Markdown syntax to embed videos.
On the other hand, you can simply use <video> HTML tag, so I will probably add support for videos in future

Q: Can it upload images to some other service?
A: For now, there are no plans to support other image hosting solutions,
but it should not be difficult for you to make a fork and create your own implementation of ImageUploader interface.

Discussion
If you have any questions/suggestions, consider using GitHub Discussions.
There is also a plugin's thread on Obsidian forum.

Known limitations
you can not paste animated gifs from the clipboard (they initially get copied as a static images to the clipboard).
Use drag and drop instead if you want to upload an animated gif.
there are daily limits for using Imgur API using associated with particular Client ID.
Known issues
Sometimes Imgur can reject your request to upload an image for no obvious reason.
The error usually reported in this case is a failed CORS request,
which does not allow Obsidian to proceed with image upload. If you face this problem, no action required from your side:
just wait, and it will disappear soon. Whenever the plugin fails to upload an image remotely,
it will fall back to the default method of storing an image locally.


#### img context menu
obsidian://show-plugin?id=copy-url-in-preview

mage Context Menus
This plugin provides the following context menus for images in Obsidian:

Copy to clipboard
Open in default app
Show in system explorer
Reveal file in navigation
Reveal in File Tree Alternative
Open in new tab
also available through middle mouse button click
It also has an Open PDF externally context menu for PDFs.

Context menus are also added to the canvas.
Most features work on mobile, but were only tested on Android. Mobile uses the native image sharing functionality instead of the clipboard, and it downloads online images temporarily so they can be shared.

This plugin used to be called "Copy Image and URL context menu". It had link URL copying functionality (see 1.5.2 and prior), but that was removed when it was included in Obsidian 1.5.

See these other plugins for related functionality:

Ozan's Image in Editor Plugin
Image Toolkit
Copying images:

Copying images video

Opening PDFs externally:

Opening PDFs externally on desktop

Installation
You can install the plugin via the Community Plugins tab within the Obsidian app.
Here's the plugin in Obsidian's Community Plugins website.
You can install the plugin manually by copying a release to your .obsidian/plugins/copy-url-in-preview folder.

This plugin on other sites
Obsidian Stats page
Obsidian Addict page
Obsidian Hub page

Development
This plugin follows the structure of the Obsidian Sample Plugin, see further details there.
Contributions are welcome.

Credits
Original plugin by NomarCub.
If you like this plugin you can spons
#### local img
obsidian://show-plugin?id=obsidian-local-images
This plugin is still young, backups are a good idea.

Obsidian Local Images is a plugin for Obsidian desktop version.

The plugin finds all links to external images in your notes, downloads and saves images locally and finally adjusts the link in your note to point to the local image files.


For example, we initially have a markup in the note like this:

![](https://picsum.photos/200/300.jpg)
Local Images plugin will download image 300.jpg, save in media subdirectory of the vault, than change the markup so it refer to locally stored image:

![](media/300.jpg)
It is useful when you copy paste parts from web-pages, and want to keep images in your vault. Because external links can be moved or expired in future.


Use it with commands:

Download images locally -- your active page will be processed.

or

Download images locally for all your notes -- will be processed all the pages in your vault, that corresponds to Include parameter in the plugin's settings.

Also you can turn on in plugin's settings processing the active page when external links pasted into the page.

The plugin was not tested with mobile version, probably it can work with it too.

Credit
This plugin was developed from niekcandaele's code base. Key principles for downloading, saving were given there, and some texts too. Even the plugin's name is original.
#### img captions
obsidian://show-plugin?id=image-captions
Add image captions
Add an image in this format:

![[image.jpg|This is a caption]]
or this format:

![This is a caption](image.jpg)
and it will add the caption underneath the image, like this:


Resize images
You can use the existing Obsidian width parameter to resize your images:

![[image.jpg|This is a caption|150]]
or this format:

![This is a caption|150](image.jpg)
Markdown in captions
You can include inline Markdown and it will be rendered as part of the caption:

![[image.jpg|This is a caption with **bold text**]]
You can use Markdown links as normal:

![[image.jpg|This is a caption with [a link to Obsidian](https://obsidian.md)]]
To use Wikilinks, you'll need to swap your square brackets [[]] for angle brackets <<>>:

![[image.jpg|This is a caption with <<a Wikilink>>]]
Use filename as caption
If you want to use the image filename as the caption, specify % as the sole text of your
caption, and it will replace that with the filename (without extension):

![[image.jpg|%]]
If you want to literally use the % character as the caption, you can escape it:

![[image.jpg|\%]]
If you want the filename including extension, use %.%.

Custom regex to filter caption
If you use other themes or plugins which require you to add data into the image description field, you can use a
regex to remove those from the final caption. You will find this in the plugin Settings.

Two common examples would be from the ITS Theme, which lets you put |right etc to change the postion of your image.

To remove everything after the first pipe | character from your caption:

^([^|]+)
If you want to keep escaped pipes \| (in case you are using internal links), use:

^((\\\||[^|])+)
Styling
You can apply CSS styling by targeting the .image-captions-figure and .image-captions-caption classes.

Limitations
The captions won't show for external images in Editing mode. For example:

![Not visible in Editing mode](https://obsidian.md/logo.png)
I couldn't find a reliable way of targeting them. Get in touch if you know a way to do this!
####
The plugin automatically handles the following when the image (png jpg jpeg) is pasted into the notes
1,Convert the image to jpeg format and compress it
2,store the image in the current notes directory in the images folder
3,Change the name of the image to the name of the current note plus a number
####

                        Awesome Image
A one-stop solution for image management together
with Obsidian Image Toolkit's marvelous image view experience.

Design philosophy
Always available. No internet? No problem. Your images live completely offline, internet or service issues will
never be your problem.
Center management. Images no more scatter around, which leads to outdated links and useless files.
Just enough automation. Auto process pasted image, but let you know all that happened.
Features
💾 Command to copy images to a user-defined folder with a uniform name, and update links in your notes.
🔗 Auto download internet images.
⚡ Auto process image the second you paste it, whether it's from internet or is binary format.
🔎 Command to list all images that are not linked by your notes, which can be deleted manually.
How to use
IMPORTANT NOTE Since the plugin can modify your notes, please back up your vault for the first time, to ensure the
plugin is acting the way you want.

The best way to use this plugin is toggle on On paste processing in settings and then
run Awesome Image: Process images for all your notes once.
After that, all your images will be in good hands.

You may also want to toggle OFF Use [[Wikilinks]] under Files & Links since only Markdown links is supported now.

Below are all commands it offers:

Press Ctrl+P (or Cmd+P on macOS) to open the Command palette.
Type the name (or partial name) of the command you want to run.
Navigate to the command using the arrow keys.
Press Enter.
The command names are:

Awesome Image: Process images for active file
Awesome Image: Process images for all your notes
Awesome Image: List images that are not linked by your notes
To see results of List images that are not linked by your notes, you may want to open Developer Tools by pressing
Ctrl+Shift+I in Windows and Linux, or Cmd-Option-I on macOS.

How it works
When Process images:

Locate the image using regex in notes.
Get image from binary data or from internet(if it is an url), calc the SHA256 hash of the image.
Copy image file to user-defined folder, image file name is derived from SHA256 to avoid conflict.
Change the image path in note to direct to the new image file.
The old image will NOT be deleted for data security reasons, you can find them using the command below.
When List images:
Compare image files and links in your notes, and display images that are not linked by your notes in Developer Tools
console.

When Paste image:
Acts just like Process images for pasted content but automated (ensure On paste processing is toggled on in settings).

####

obsidian://show-plugin?id=awesome-image
Awesome Image
A one-stop solution for image management together
with Obsidian Image Toolkit's marvelous image view experience.

Design philosophy
Always available. No internet? No problem. Your images live completely offline, internet or service issues will
never be your problem.
Center management. Images no more scatter around, which leads to outdated links and useless files.
Just enough automation. Auto process pasted image, but let you know all that happened.
Features
💾 Command to copy images to a user-defined folder with a uniform name, and update links in your notes.
🔗 Auto download internet images.
⚡ Auto process image the second you paste it, whether it's from internet or is binary format.
🔎 Command to list all images that are not linked by your notes, which can be deleted manually.
How to use
IMPORTANT NOTE Since the plugin can modify your notes, please back up your vault for the first time, to ensure the
plugin is acting the way you want.

The best way to use this plugin is toggle on On paste processing in settings and then
run Awesome Image: Process images for all your notes once.
After that, all your images will be in good hands.

You may also want to toggle OFF Use [[Wikilinks]] under Files & Links since only Markdown links is supported now.

Below are all commands it offers:

Press Ctrl+P (or Cmd+P on macOS) to open the Command palette.
Type the name (or partial name) of the command you want to run.
Navigate to the command using the arrow keys.
Press Enter.
The command names are:

Awesome Image: Process images for active file
Awesome Image: Process images for all your notes
Awesome Image: List images that are not linked by your notes
To see results of List images that are not linked by your notes, you may want to open Developer Tools by pressing
Ctrl+Shift+I in Windows and Linux, or Cmd-Option-I on macOS.

How it works
When Process images:

Locate the image using regex in notes.
Get image from binary data or from internet(if it is an url), calc the SHA256 hash of the image.
Copy image file to user-defined folder, image file name is derived from SHA256 to avoid conflict.
Change the image path in note to direct to the new image file.
The old image will NOT be deleted for data security reasons, you can find them using the command below.
When List images:
Compare image files and links in your notes, and display images that are not linked by your notes in Developer Tools
console.

When Paste image:
Acts just like Process ima

#### Obsidian Image Uploader
obsidian://show-plugin?id=obsidian-image-uploader

This plugin could resize(optional) and upload the image in your clipboard to any image hosting automatically when pasting.

Changelog
0.3.2
Add 'Upload All Local Images in This Page' command.
0.3.1
Fix some minor problems.
0.3.0
Support Obsidian Live Preview Editor.
Getting started
Settings
Api Endpoint: the Endpoint of the image hosting api.
Upload Header: the header of upload request in json format.
Upload Body: the body of upload request in json format. Don't change it unless you know what you are doing.
Image Url Path: the path to the image url in http response.
Enable Resize: whether resizing images before uploading.
Max Width: images that wider than this will be resized resized by the natural aspect ratio.
Examples
Imgur
Take Imgur as an example. The upload request is something like this:

curl --location --request POST 'https://api.imgur.com/3/image' \
--header 'Authorization: Client-ID {{clientId}}' \
--form 'image="R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"'
So, Api Endpoint should be https://api.imgur.com/3/image and Upload Header should be {"Authorization": "Client-ID {{clientId}}"}.

The response of the upload request is:

{
	"data": {
		"id": "orunSTu",
		"title": null,
		"description": null,
		"datetime": 1495556889,
		"type": "image/gif",
		"animated": false,
		"width": 1,
		"height": 1,
		"size": 42,
		"views": 0,
		"bandwidth": 0,
		"vote": null,
		"favorite": false,
		"nsfw": null,
		"section": null,
		"account_url": null,
		"account_id": 0,
		"is_ad": false,
		"in_most_viral": false,
		"tags": [],
		"ad_type": 0,
		"ad_url": "",
		"in_gallery": false,
		"deletehash": "x70po4w7BVvSUzZ",
		"name": "",
		"link": "http://i.imgur.com/orunSTu.gif"
	},
	"success": true,
	"status": 200
}
All you need is the image url http://i.imgur.com/orunSTu.gif, so Image Url Path should be data.link.

Lsky-Pro
Lsky-Pro is a open-sourced and self-hosted image hosting solution.

Thanks to @xaya1001 for this example.

api endpoint：https://img.domain.com/api/v1/upload

upload header: 
{
  "Authorization": "Bearer xxxx",
  "Accept": "application/json",
  "Content-Type": "multipart/form-data"
}

upload body: 
{
  "file": "$FILE"
}

Image Url Path: data.links.url
Thanks
#### img upload toolkit
obsidian://show-plugin?id=image-upload-toolkit
Obsidian Image Upload Toolkit
This plugin cloud upload all local images embedded in markdown to specified remote image store
(support imgur,AliYun OSS and Imagekit, currently) and export markdown with image urls to clipboard directly.
The origin markdown in vault is still using local images.

It will be help for publishing to the static site such GitHub pages.

The idea of plugin comes from the powerful markdown editor MWeb Pro I have been
used for years.

During plugin development, I also referred to plugins obsidian-imgur-plugin
(the imgur uploading codes is from it) and obsidian-image-auto-upload-plugin. Thanks both for
providing such great plugins.

This plugin is listed in the Obsidian community plugins now.

Usage
Open command and type "publish page", it will upload all local images to remote store
and copy markdown with replaced image syntax to clipboard with notification.

screenshot

TODO
support uploading images to more storages
imageur
Aliyun Oss
ImageKit
Amazon S3
TencentCloud COS
more...
setting for replacing images embedded in origin markdown directly
Contributing
To make changes to this plugin, first ensure you have the dependencies installed.

npm install
Development
To start building the plugin with what mode enabled run the following command:

npm run dev
Note: If you haven't already installed the hot-reload-plugin you'll be prompted to. You need to enable that plugin in your obsidian vault before hot-reloading will start. You might need to refresh your plugin list for it to show up.

Releasing
To start a release build run the following command:

npm run build
Thanks
obsidian-imgur-plugin
(reference to the imgur uploading codes in it)
obsidian-image-auto-upload-plugin
create-obsidian-plugin
Appendix
Imgur Users: Obtaining your own Imgur Client ID
Imgur service usually has a daily upload limits. To overcome this, create and use your own Client ID. This is generally easy, by following the steps below :

If you do not have an imgur.com account, create one first.

Visit https://api.imgur.com/oauth2/addclient and generate Client ID for Obsidian with following settings:

provide any application name, i.e. "Obsidian"
choose "OAuth 2 authorization without a callback URL" (important)
Add your E-Mail
Copy the Client ID. (Note: You only need Client ID. The Client secret is a private info that is not required by this plugin. Keep it safe with you)

Paste this Client ID in plugin settings
#### copy img
obsidian://show-plugin?id=copy-image
Easily copy image from Obsidian to clipboard by right clicking image.

Features
Right-Click Copy: Simply right-click on any image to 'Copy Image'. The image will be copied to your clipboard, ready to be pasted anyware.
Manual Installation
In Obsidian, open Settings > Third-party plugin.
Turn off Safe mode.
Click on Browse community plugins.
Search for "Copy Image".
Click Install.
Once installed, toggle the plugin on in the list of installed plugins.
Usage In Desktop
Right-click on an image to 'Copy Image' to clipboard.
Usage In Mobile
Just touch the image and hold without move for 1 second.
Enjoy your enhanced Obsidian experience with the Obsidian Copy Image Plugin!
#### media sync
obsidian://show-plugin?id=media-sync
Media Sync
Media Sync is a plugin for Obsidian that allows you to downloads media files(eg. images, PDFs) from the URLs in Obsidian documents and displays the content.

How to use
Caution!

When processing large numbers of files, please make backups before executing.

Click the Media sync icon in the left sidebar.


Then, the plugin will start downloading media files from the URLs in the documents.

Once an media file has been downloaded, the Markdown file will not be processed the next time.

The following media files with URLs starting with https.


The media file is downloaded locally and the Markdown link is updated.


A directory named _media-sync_resouces is created and the media files are downloaded into that directory paths can be changed in the configuration.


Right-click on the file and click Media sync to download the media files for the target note only.

When executed from the leaf icon, notes are cached and the media download process is skipped once the notes are executed, but right-click execution always downloads the media files.
#### emo
obsidian://show-plugin?id=emo-uploader
Obsidian Emo Uploader
      

      

      

Embed markdown online file/image links.  

This plugin is for uploading images to hosting platform or files to Github(more, now) in Obsidian.  

图床聚合 & 文件上传器 : Imgur SM.MS Github Cloudinary Catbox ……

🚩中文  

How it Works

State
file hosting                        	image hosting                      	Multi language support                              
GitHub        	Imgur        	简体中文                                            
Clouinary	SM.MS          	繁體中文 @emisjerry
Catbox        	ImgURL  	English                                            
AList    	imgbb        	                                                   
                                     	chevereto	                                                   
EasyImages	                                                   
V2.19
support EasyImages, thanks to anxinJ.

V2.17
support AList, thanks to Linnnkkk.

V2.16
Adapted to chevereto v3

V2.15
support chevereto

V2.14
Add Github cdn switch

Tips
If you want to create your own client-ID In Imgur, Redirect: obsidian://emo-imgur-oauth.  

Remember your username when registering catbox.🤨

Starting from version 2.6, clipboard and drag files are supported; Non-image files will appear as links without "!" at the beginning by default after being embed in markdown.

How to Extend
Want to support more platforms? If you want to contribute and don't want to make too much effort on reading old code, you can extend it in the following ways.  

Refer to existing parms files, and add the parameters required by your new uploader by adding files to src/Parms.
Use your parms interface. In config.ts, add parameter configurations about your uploader to provide choices and act as constructors for uploader at run time.
Implement your uploader and settings panel by adding files to src/Uploader, src/Fragment.
In settings-tab.ts,add your fragment to show and set parameters in the setting-tab.
Add your uploader to the UploaderMap in main.ts.
Test it.
It's done! 😽

Configuration
Disable Obsidian Safe Mode
Install the Plugin
   - Install from the Obsidian Community Plugins tab

   - use Release

      - download main.js manifest.json or zip file in the latest Release

      - move main.js manifest.json in a folder in your obsidian vault's plugin folder

   - Manual install

      - Clone this repo

      - Install dependencies with yarn or npm like npm install

      - yarn run dev will start compilation

Enable the Plugin
Configure the settings 👉 some datails: take configuring github as an example
Enjoy convenience 🌟
About Uploading to Github
For uninitiated visitors from outside the code world, Github is a famous internet hosting service for software development and version control using Git.  

If you need more help on hosting images, go to the other parts. These services are more focused on this.

What is It?
This part allows you to automatically upload files pasted to Obsidian directly into your Github repository ( instead of stored locally ). It's useful when you want to mention a file in your note which you think is good for sharing like script, config-file or anything.  

Of course, it can be a simple image uploader. It does a good job of embedding images into markdown files.  

But more than a image uploader, You can upload various types of files, as long as Github accepts them.  

Whether the file link can be rendered in obsidian or not depends on the support of obsidian itself. It doesn't matter, even if they can't be rendered, they can still be used as links. 🍭 Just remove the exclamation point at the beginning.  

About Use Policy
GitHub terms-of-service  

jsdelivr Use Policy  

⚠️ Note that

The Github target repository must be public, which means that all files uploaded are public. Github should also be more for those who are happy to share. Please make sure that it is harmless for you to share the files you upload. Personally, I'm looking forward to the day when one of your uploads will be for selfless sharing.  🌻  
Do not upload Empty file. It's meaningless and wrong here.
It is recommended to check the random filename in the panel. Duplicate file name will raise an error. Random file names will greatly avoid duplicate file names.  
In general, Github is generous enough. But you need to get a sense of proportion, don't abuse Github's services too hard. Take it easy, normal use, such as in Github pages, is of course acceptable. But if you need to use images in large quantities, please use a professional image hosting service. ( Now it has been integrated into this plugin ). Going beyond the normal range (e.g. storing more than 1GB files in a single repository), abusing Github, and uploading bad files with undesirable effects may cause your Github repository or even account to be affected.
I use jsdelivr here. It is free. Just like above, don't abuse it. Just like what I do in the video, it's not good to use jsdelivr on transferring large video, I have deleted it. My case is a small size video. 😼
About the Other
Except for github, all the others here are purely hosting platforms. Register an account and find parameters you need. Just put your parameters to the correct positions. Then you can use it just like the way in the video.  

ImgURL, SM.MS are cloud storage platforms that allows you to upload images to a storage account. For users living in China, they are easier to access than Github and Cloudinary.  

About Cloudinary, please refer to obsidian-cloudinary-uploader/README.md. Of course, Cloudinary is supported here. If you find that Cloudinary is enough to meet your needs, you can just use it. ( In fact, my plugin is smaller on size. 😳 )

If you live in China, imgbb is not recommended to use. I found that the pictures uploaded to this platform could not be easily accessed in Chinese Mainland and they are usually presented as thumbnails.

Imgur is good. But in my network environment, it is not easy to access and test. I simply implemented anonymous upload with reference to some posts. Thanks for this reference. When using imgur anonymous upload, deletehash will appear in the form of ![deletehash](url), which is used to prevent you from regretting the upload of wrong pictures. You can delete them here or in the plugin.

Catbox originally supports anonymous uploads. But I didn't find out how to delete anonymously uploaded files. To avoid accidents, anonymous uploads of catbox are not provided here.

⚠️ Files are public to see on them. Don't upload prohibited things! Please check the service restrictions by yourself.

Note
Due to the different range of files supported by different platforms, there are no restrictions on the types of files you paste in this plugin. This will lead to the situation that unsupported types are uploaded failed without a correct response. Fortunately, there are not many cases in which strange file types are embedded in documents. (there won't be many, right? )

If you need to embed the file as an attachment, please close the plugin temporarily.

In general, Github, Cloudinary, Catbox supports any file type, SM.MS, ImgURL supports common image types.  

Trying to upload a file that the platform does not support or volume exceeds the upper limit may result in a string like ![](undefined). Notice it, don't just wait.  

If you are enjoying the plugin then you can support my work and enthusiasm by buying me a cola:  

BuyMeACola

Thank you!

Thanks
                                                                                           	Thanks                                              	                                                                         
obsidian-cloudinary-uploader	Github REST API	jsdelivr                                    
SM.MS                                                                  	ImgURL                  	Clouinary                                    
Imgur                                                                	imgbb                        	obsidian-imgur-plugin
Catbox	chevereto	AList
EasyImages		
#### s3 img uploader
obsidian://show-plugin?id=s3-image-uploader
S3 Image Uploader
This is a plugin for Obsidian. It was generated based on the standard plugin template.

This project implements an image uploader, similar to others offered by the community, with one important difference: you can provide your own s3 based storage, instead of relying on a third party service, such as imgur.

This plugin is supported by advertisements.

Note: this plugin is still in development, and there may be some bugs. Please report any issues you find.

It was inspired by the awesome Markdown editor, Typora, and the following Obsidian plugins:

Obsidian Image Uploader
Remotely Save
Obsidian Imgur Plugin
Usage
You have to set up your own s3 bucket, and provide the following information to the plugin:

accessKeyId: the access key ID for an s3 user with write access to your bucket
secretAccessKey: the secret access key for the s3 user
region: the region of your bucket
bucket: the name of your bucket (must already exist)
folder: the folder in your bucket where you want to store the images (optional, and will be created on the fly if it does not exist.)
If you want others to be able to view the images, you need to make your bucket world readable. You can do this by adding the following policy to your bucket:

{
	"Version": "2008-10-17",
	"Statement": [
		{
			"Sid": "PublicReadGetObject",
			"Effect": "Allow",
			"Principal": "*",
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::<your-bucket>/*"
		}
	]
}
You also need to set up a CORS policy for the bucket:

[
	{
		"AllowedHeaders": ["*"],
		"AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
		"AllowedOrigins": ["*"],
		"ExposeHeaders": []
	}
]
You also need to set up a user with write access to your bucket. You can do this by creating a new user in the IAM console, and attaching the AmazonS3FullAccess policy to it. More granular access control policies are possible, but this is the simplest way to get started.

When you paste an image from the clipboard into the Obsidian note, the plugin will upload the image to your bucket, and insert a link to the image in your note. The link will be of the form https://<your-bucket>.s3.<your-region>.amazonaws.com/<your-optional-folder>/<image-name>. If you have made your bucket world readable, you can share the link with others, and they will be able to view the image.

If you select the "Upload on drag" option in the plugin settings, the plugin will also upload images that you drag into the note - as well as video, audio files and pdfs. This is useful if you want to upload these media from your file system.

If you do not want this behavior in all notes, you can customize it on a per note basis.

You can add an uploadOnDrag YAML frontmatter tag to the note, as seen below.
You can also set the localUpload option to true, which will copy the images to a folder in your local file system, instead of uploading them to the cloud, overriding the global setting.
You can also set note specific folder where the images will be uploaded to, by adding the localUploadFolder option to the YAML frontmatter. This overrides the global setting.
These settings override the global settings. The uploadOnDrag tag affects both S3 and local uploads. The other two options only affect local uploads.

---
uploadOnDrag: true
localUpload: true
localUploadFolder: "my-folder"
---
Development
PR's are welcome, features that I would like to add include:

Add support for other cloud storage providers, such as Google Drive, Dropbox, etc.
Add support for copying images to a configurable folder in the local file system, instead of uploading them to the cloud.
Add support for dynamically moving images between the options above, through hotkeys.
Add support for automatically creating buckets if they do not exist.
Add support for s3 compatible storage
Add support for video, audio, and pdf upload and embedding.
Releasing new releases
Update your manifest.json with your new version number, such as 1.0.1, and the minimum Obsidian version required for your latest release.

Update your versions.json file with "new-plugin-version": "minimum-obsidian-version" so older versions of Obsidian can download an older version of your plugin that's compatible.

Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix v. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases

Upload the files manifest.json, main.js, styles.css as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.

Publish the release.

You can simplify the version bump process by running npm version patch, npm version minor or npm version major after updating minAppVersion manually in manifest.json. The command will bump version in manifest.json and package.json, and add the entry for the new version to versions.json

#### cloudinary uploader
obsidian://show-plugin?id=obsidian-cloudinary-uploader
Cloudinary Uploader for Obsidian
Downloads
License

View site - Retype

License
Released under MIT by @jordanhandy.

Documentation
Documentation

What is it?
Cloudinary is a cloud storage platform that allows you to upload various media files to a storage account. The media files within this storage account can then be manipulated using Cloudinary's APIs to manipulate the data properties and metadata.

This plugin allows you to automatically upload images, video, audio and raw files pasted to Obsidian directly into your Cloudinary account (instead of stored locally). Note: There is functionality for media manipulation in this plugin using Cloudinary's custom parameters

How it Works
Single File Upload
Action GIF

Multi-file Upload
https://github.com/jordanhandy/obsidian-cloudinary-uploader/assets/6423379/6b81fd36-c09e-4bd6-a313-0ec25e723251

Configuration
Disable Obsidian Safe Mode
Install the Plugin
Install from the Obsidian Community Plugins tab
Manual install
Clone this repo
Install dependencies with yarn or npm
npm run dev will start compilation
Enable the Plugin
Configure the settings and set your:
Cloud Name
Upload Preset Name (Set that here)
Set a Folder Name
Optional configuration
Cloudinary default transformation parameters
Unsigned vs. Signed Uploads to Cloudinary
The uploads to Cloudinary are unsigned. You can read more about that here. A signed upload would require the use of an API key and secret, and I opted against asking for that in the plugin configuration, as a choice for security reasons.

Transformations
Cloudinary allows for on-the-fly image transformations using their API. To the end-user, this is accomplished by making a simple URL modification to the resulting URL that Cloudinary gives back when an upload completes. You can read more about Cloudinary's transformation parameters here.
As of version 0.2.0, you can now set a default transformation to be applied to all of your uploads with a comma-delimited list. Be mindful of syntax, as using the incorrect transformation parameters will cause your images to not render in Obsidian.

If this were to happen, this can be fixed by simply modifying the URL following the upload.

Be Mindful of your transformation token allotment. Depending on your plan, Cloudinary allows for an 'x' number of transformations to take place per month. Keep this count in mind as you apply transformations to your uploads

Thanks
Special thanks to:

@Creling and their repo here. As this was my first time creating an Obsidian plugin, their base really helped.
Obsidian Unofficial Plugin Developer Docs
Other Plugins
If you would like to use a plugin with more customization options that supports audio, video, and binary formats, check out my imgBB Uploader for Obsidian
#### tinypnbg img
obsidian://show-plugin?id=tinypng-image
Obsidian TingPNG Plugin
This streamlines Obsidian workflows by integrating TinyPNG's image compression service.

Note: This is NOT an official plugin from the TingPNG team. It is a community plugin.

Installation
You can install the Obsidian TingPNG Plugin by following these steps:

Download 3 files: main.js, manifest.json, styles.css from the latest release.
Create a folder named "obsidian-tinypng-plugin" in your Obsidian vault's plugins folder.
Once the plugin is installed, activate it by toggling the switch next to its name.
Configuration
To configure the TingPNG plugin, you need to provide your API key and set the concurrency options. Here's how you can do it:

Open the settings in Obsidian.
Go to the "Plugins" section and find the TingPNG plugin.
Enter your API key from Tinify in the corresponding field.
Choose the desired concurrency level from the options provided.
Click the "Save" button to save your settings.
Usage
To compress images using the TingPNG plugin, follow these steps:

Open Obsidian and navigate to the vault where your images are located.
Press Ctrl/Cmd + P to open the command palette.
Search for "Compress Images" and select it from the list.
The plugin will start compressing the images using the provided API key and concurrency options.
Once the compression is complete, you will see a notification with the results.
Note: Make sure to review the TingPNG terms of service and API usage limits before using the plugin.

Feedback and Support
If you encounter any issues with the TingPNG plugin or have suggestions for improvements, please reach out to the community for support.

Disclaimer: This plugin is not affiliated with or endorsed by the TingPNG team. Use at your own risk.

#### cloudinary
obsidian://show-plugin?id=cloudinary
Cloudinary
What is it?
Cloudinary is a cloud storage platform that allows you to upload various media files to a storage account. The media files within this storage account can then be manipulated using Cloudinary's APIs to manipulate the data properties and metadata.

This plugin will make all files (images, video, audio) dragged or pasted in the editor, upload to Cloudinary Media Library rather than file system. You will get links which are uch easier on internet and memory on rendering them in your Obsidian notes.

You can customize the upload behaviour and transformation options for each content type and each folder in you vault.

How it Works
Action GIF
Configuration
Disable Obsidian Safe Mode
Install the Plugin
Install from the Obsidian Community Plugins (Recommended)
Go to Settings > Community Plugins > Browse
Search for "Cloudinary" and install
Manual install
Clone this repo
Install dependencies with yarn or npm
npm run build will install the plugin in the chosen obsidian vault
Enable the Plugin
Configure the settings
Unsigned Uploads to Cloudinary
This plugin uploads to Cloudinary are unsigned. You can read more about that here. A signed upload would require the use of an API key and secret, and I opted against asking for that in the plugin configuration, as a choice for security reasons.

Transformations
Cloudinary allows for on-the-fly image transformations using their API. To the end-user, this is accomplished by making a simple URL modification to the resulting URL that Cloudinary gives back when an upload completes. You can read more about Cloudinary's transformation parameters here.
As of version 0.2.0, you can now set a default transformation to be applied to all of your uploads with a comma-delimited list. Be mindful of syntax, as using the incorrect transformation parameters will cause your images to not render in Obsidian.

If this were to happen, this can be fixed by simply modifying the URL following the upload.

Be Mindful of your transformation token allotment. Depending on your plan, Cloudinary allows for an 'x' number of transformations to take place per month. Keep this count in mind as you apply transformations to your uploads

Thanks
Special thanks to:

@jordanhandy for their repo here. I forked this repo and made some changes to it, but the base of this plugin is from their work.
#### img to lskypro
obsidian://show-plugin?id=lskypro-auto-upload
Obsidian LskyPro Auto Upload Plugin
This is a tool that supports uploading images directly to the image bed Lsky, based on renmu123/obsidian-image-auto-upload-plugin modification.
Remember to restart Obsidian after updating the plugin

Start
Install the LskyPro image bed and configure it. For configuration, refer to official website
Open the interface of LskyPro
Use the authorization interface to obtain Token and record it
Open the plug-in configuration item and set the LskyPro domain name (for example: https://lsky.xxx.com)
Set LskyPro Token
The storage policy ID is an optional configuration, and it is configured according to LskyPro's policy and its own requirements. If there is only one policy, it does not need to be set
Features
Upload when paste image
It supports uploading directly when pasting pictures from the clipboard, and currently supports copying images in the system and uploading them directly.
Support to control the upload of a single file by setting frontmatter, the default value is true, please set the value to false to control the shutdown

Support ".png", ".jpg", ".jpeg", ".bmp", ".gif", ".svg", ".tiff" (because it directly calls the LskyPro interface, theoretically the files supported by the image bed It will be all right)

---
image-auto-upload: true
---
Upload all local images file by command
press ctrl+P and input upload all images，enter, then will auto upload all local images

The path resolution priority will be searched according to the priority in turn:

Absolute path, refers to the absolute path based on the library
Relative paths, starting with ./ or ../
shortest possible form
download all internet to local
press ctrl+P and input upload all images，enter, then will auto upload all local images

Support drag-and-drop
Allow multiple file drag and drop

TODO
Thanks
#### find orphaned img
obsidian://show-plugin?id=find-orphaned-images
Find Orphaned Images Plugin for Obsidian
Utility add-on for Obsidian knowledge base.

*Keep your Obsidian vaults tidy with the Find Orphaned Images plugin!*

Obsidian Plugin
GitHub release (latest by date including pre-releases)
Create Release
Obsidian Downloads

Find Orphaned Images is an Obsidian plugin designed to help you keep your vault clean and organized by identifying and managing images that are not linked anywhere in your notes. With this plugin, you can:

Generate a note with a report of all the orphaned (not linked) images in your vault.
Delete all the orphaned images in your vault.
Features
Identify Orphaned Images: Scan your vault to find images that are not linked in any note.
Generate Reports: Create a report listing all orphaned images, with options to display images directly or link to them.
Delete Orphaned Images: Remove orphaned images.
Customizable Settings: Define which image extensions to look for and set a maximum number of images to delete.
Sidebar Button: Access the plugin's features using the sidebar button or with the slash command.
Installation
Download the Plugin: You can download the latest release from the GitHub Releases page.

Extract the Files: Extract the downloaded zip file and copy the files into your Obsidian vault's plugins directory: .obsidian/plugins/find-orphaned-images/.

Enable the Plugin: In Obsidian, go to Settings -> Community plugins, disable safe mode if it's enabled, and then search for "Find Orphaned Images". Enable it to start using the plugin.

Configure Settings: Go to Settings -> Find or Delete Orphaned Images to configure your preferences.

Usage
1. Using the Sidebar Button
Enable Sidebar Button: Ensure the sidebar button is enabled in the plugin settings.
Click the Button: Click the button in the sidebar to open the options modal. From here, you can choose to create a report, view images, or delete orphaned images.
2. Running Commands
You can also access the plugin's features via commands:

Find Orphaned Images: Use the Command Palette (Ctrl+P or Cmd+P) and type Find Orphaned Images to open the options modal. Alternativelly, use the slash command.
3. Settings
Image Extensions: Specify which image file extensions to search for. Default: png, jpg, jpeg, gif, svg, bmp.
Max Delete Count: Set a limit on how many images can be deleted in one operation. Use -1 for no limit.
Show Sidebar Button: Toggle the sidebar button on or off for quick access to the plugin's features.
Screenshots
Modal Options
Modal
Configuration Options
Configuration-Options
Contributing
Contributions are welcome! If you have suggestions for new features or find a bug, please open an issue or submit a pull request.

Fork the Repository: Click the "Fork" button at the top right of this page to fork this repository.

Clone Your Fork: Use the command git clone https://github.com/yourusername/find-orphaned-images.git to clone your forked repository.

Create a Branch: Use git checkout -b your-feature-branch to create a branch for your feature or bug fix.

Make Changes: Make your changes and commit them with a descriptive message.

Push to Your Fork: Use git push origin your-feature-branch to push your changes.

Open a Pull Request: Navigate to your fork on GitHub and click the "New pull request" button.

License
This project is licensed under the GPL-3. See the LICENSE file for more information.

Acknowledgements
Thanks to the Obsidian Community for their support and feedback.
Inspired by the need to keep vaults organized and efficient.

####




## nom de domaines



Pour gérer 3 noms de domaine différents de manière économique, voici les meilleures options :

1. **Achat des domaines** :
   - Registrars économiques recommandés :
     - OVH (~5-8€/an par domaine)
     - Cloudflare Registrar (prix coûtant, souvent ~8-10€/an)
     - NameCheap (promotions fréquentes)
   - Éviter GoDaddy (prix de renouvellement élevés)

2. **Configuration CDN** :
   - **Option gratuite** :
     - Utiliser Cloudflare gratuit comme proxy
     - Configurer les CNAME vers Cloudinary/TwicPics
     - Bénéficier du CDN Cloudflare gratuitement

   - **Option payante mais optimale** :
     - Plan Business Cloudinary (~30-40€/mois)
     - Inclut les domaines personnalisés
     - Meilleure optimisation des images

3. **Structure recommandée** :
   ```
   votresite1.com
   - media.votresite1.com -> CDN

   votresite2.com
   - media.votresite2.com -> CDN

   votresite3.com
   - media.votresite3.com -> CDN
   ```

Budget annuel minimal :
- Domaines : ~30€/an (3 × 10€)
- CDN : Gratuit avec Cloudflare + Cloudinary gratuit
- Total : ~30€/an pour les 3 sites

C'est la solution la plus économique tout en gardant une bonne qualité de service.




Non, je m'excuse, j'ai fait une erreur dans mon estimation. Faisons un calcul plus précis :

1. **Cloudinary** :
   - Version gratuite :
     - Limitée en bande passante
     - Pas de support pour les domaines personnalisés
   - Version Plus (~45€/mois) :
     - Nécessaire pour les domaines personnalisés
     - ~540€/an

2. **Domaines** :
   - 3 domaines × ~10€/an = ~30€/an

3. **Total réel** :
   - ~570€/an minimum avec Cloudinary

Alternatives plus économiques :

1. **Solution Cloudflare R2 + Workers** :
   - Stockage R2 : Prix au Go (~0.015$/Go)
   - Workers : Gratuit jusqu'à 100k requêtes/jour
   - Domaines : ~30€/an
   - Total : Beaucoup moins cher, dépend du volume

2. **Solution DigitalOcean Spaces** :
   - Stockage : ~5$/mois
   - CDN inclus
   - Domaines : ~30€/an
   - Total : ~90€/an

3. **Solution Bunny.net** :
   - Storage : ~1$/mois/100GB
   - CDN : Prix très bas par TB
   - Domaines : ~30€/an
   - Total : ~100-150€/an

Je recommande soit Cloudflare R2 + Workers, soit Bunny.net qui sont beaucoup plus économiques que Cloudinary pour plusieurs domaines.



Cloudflare R2 est un service de stockage d'objets (object storage) similaire à Amazon S3, mais avec quelques avantages clés :

1. **Caractéristiques principales** :
   - Stockage de fichiers dans le cloud
   - Compatible avec l'API S3
   - Intégré au réseau CDN mondial de Cloudflare
   - Pas de frais de sortie (egress fees) contrairement à AWS S3

2. **Tarification avantageuse** :
   - Stockage : $0.015 par GB/mois
   - Opérations : 
     - Classe A (PUT, POST, LIST) : $4.50 par million de requêtes
     - Classe B (GET) : $0.36 par million de requêtes
   - Pas de frais pour le transfert sortant

3. **Utilisation avec Workers** :
   - Workers = fonctions serverless de Cloudflare
   - Permet de :
     - Transformer les images à la volée
     - Gérer l'authentification
     - Personnaliser les URLs
     - Optimiser les images

4. **Avantages pour votre cas** :
   - Un seul bucket R2 peut servir vos 3 domaines
   - Configuration via Workers pour router selon le domaine
   - Optimisation des images possible
   - Prix prévisible et économique

C'est une alternative moderne et économique aux services comme Cloudinary, particulièrement intéressante si vous maîtrisez un peu le développement pour configurer les Workers.



Oui, Cloudflare propose des transformations d'images avec R2, mais il y a quelques nuances importantes :

1. **Images Cloudflare** :
   - Service dédié à l'optimisation d'images
   - Transformations disponibles :
     - Redimensionnement
     - Compression
     - Conversion de format (WebP, AVIF)
     - Adaptation selon le device
     - Qualité ajustable
   
2. **Mise en place** :
   - Nécessite l'utilisation de Cloudflare Workers
   - Deux options :
     ```typescript
     // Option 1 : Images Cloudflare
     const imageURL = "https://votre-worker.dev/image.jpg?width=800&format=auto"
     
     // Option 2 : Workers + API Images
     const image = await fetch(imageURL)
     const transformed = await fetch("https://api.cloudflare.com/client/v4/images/v1/...", {
       body: image
     })
     ```

3. **Différences avec Cloudinary** :
   - Moins de transformations avancées
   - Configuration plus technique
   - Mais plus économique
   - Nécessite plus de code personnalisé

4. **Limites** :
   - Taille maximale : 10 MB par image
   - Formats supportés plus limités
   - Transformations moins sophistiquées

Pour votre plugin, il faudrait développer un nouveau service similaire au `CloudinaryService` mais adapté pour R2 + Images Cloudflare. Souhaitez-vous que je vous montre un exemple de cette implémentation ?





Je vais vous montrer comment implémenter un service pour Cloudflare R2 + Images. Je vais d'abord créer un nouveau service qui suivra la même structure que notre `CloudinaryService`.

```typescript

```:src/core/services/CloudflareR2Service.ts

```


Maintenant, nous devons créer le Worker Cloudflare qui va gérer l'upload vers R2 et les transformations d'images. Je vais créer un exemple de Worker :

```:worker/r2-worker.ts

```


Voici comment cela fonctionne :

1. **Service côté plugin** (`CloudflareR2Service.ts`) :
   - Gère l'authentification
   - Prépare les uploads
   - Formate les URLs avec les paramètres de transformation

2. **Worker Cloudflare** (`r2-worker.ts`) :
   - Gère les uploads vers R2
   - Applique les transformations d'images
   - Sert les images avec cache

3. **Utilisation** :
   ```typescript
   // Upload d'une image
   const url = await cloudflareService.upload(file);
   
   // URL résultante avec transformations
   // https://votre-worker.dev/image.jpg?width=800&format=auto&quality=80
   ```

4. **Transformations disponibles** :
   - `width` : Largeur de l'image
   - `height` : Hauteur de l'image
   - `format` : Format de sortie (auto, webp, avif)
   - `quality` : Qualité de compression (auto, 1-100)

Pour utiliser ce service, il faudra :
1. Créer un bucket R2 dans Cloudflare
2. Déployer le Worker
3. Configurer les variables d'environnement du Worker
4. Mettre à jour les paramètres du plugin avec vos identifiants

Voulez-vous que je vous montre comment configurer tout cela dans Cloudflare ?


Dans notre cas, puisque nous gérons principalement des images, Cloudflare Images est plus adapté que R2 car il offre des optimisations automatiques et un meilleur rapport qualité/prix pour ce cas d'usage spécifique.
Non, en fait j'ai fait une erreur dans l'implémentation. Cloudflare Images (qui est différent de R2) offre effectivement des optimisations automatiques. Je vais modifier le code pour mieux l'utiliser :

```:worker/r2-worker.ts

```


Voici les améliorations apportées :

1. **Optimisations automatiques** avec Cloudflare Images :
   - Détection automatique du device et de sa résolution
   - Choix automatique du meilleur format (WebP/AVIF)
   - Compression intelligente
   - Mise en cache globale
   - Redimensionnement adaptatif

2. **Avantages** :
   - Plus besoin de spécifier manuellement width/height/quality
   - Meilleure performance car optimisé selon le device
   - Moins de code à maintenir
   - CDN global inclus

3. **Prix** :
   - Cloudflare Images : à partir de $5/mois pour 100k images
   - Plus économique que R2 pour les images
   - Inclut toutes les transformations

4. **Utilisation** :
   ```typescript
   // Upload simple
   const response = await cloudflareService.upload(file);
   // L'URL retournée est déjà optimisée automatiquement
   ```

Si vous voulez quand même personnaliser certaines images, vous pouvez toujours ajouter des paramètres :
```typescript
// Paramètres optionnels
const url = response.url;
const customUrl = `${url}/w=800,q=75`; // Pour une largeur et qualité spécifique
```

C'est beaucoup plus simple et efficace que la version précédente avec R2 !




R2 est le service de stockage d'objets (object storage) de Cloudflare, similaire à Amazon S3. Voici les points clés :

1. **Fonctionnalités principales** :
   - Stockage de fichiers dans le cloud
   - Compatible avec l'API S3
   - Intégré au réseau CDN Cloudflare
   - Pas de frais de sortie (contrairement à S3)

2. **Différence avec Cloudflare Images** :
   - R2 = stockage brut de tout type de fichiers
   - Cloudflare Images = service spécialisé pour les images avec :
     - Optimisation automatique
     - Transformations
     - CDN optimisé pour les images

3. **Cas d'utilisation** :
   - R2 : 
     - Stockage de fichiers (PDF, ZIP, vidéos...)
     - Backups
     - Assets statiques
   - Cloudflare Images :
     - Uniquement pour les images
     - Quand on veut des optimisations automatiques

4. **Prix** :
   - R2 : 
     - Stockage : $0.015/GB/mois
     - Pas de frais de sortie
   - Cloudflare Images :
     - À partir de $5/mois pour 100k images
     - Inclut toutes les optimisations

Dans notre cas, puisque nous gérons principalement des images, Cloudflare Images est plus adapté que R2 car il offre des optimisations automatiques et un meilleur rapport qualité/prix pour ce cas d'usage spécifique.



