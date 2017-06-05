# Crypted WebDAV Server

Start a preconfigured WebDAV server (based on webdav-server), which store files in a folder, encrypt and compress them. The encryption is AES256 CBC using a master password.

## Install

```bash
npm i -g cwdav
```

## Usage

```bash
cwdav [<config-file-json>]

# load the file './cwdav.json' or, if it doesn't exist,
# load a default configuration (store all in the './data'
# folder, creates it if it doesn't exist).
cwdav

# Load a specific configuration file
cwdav "/home/dev/path/config/.cwdav.json"
cwdav .cwdav.json
```