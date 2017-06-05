# Crypted WebDAV Server

Start a preconfigured WebDAV server (based on webdav-server), which store files in a folder, encrypt and compress them. The encryption is AES256 CBC using a master password.

## Install

```bash
npm i -g cwdav
```

## Usage

```bash
cwdav [<config-file-json>]

# Load the file './cwdav.json' or, if it doesn't exist,
# load a default configuration (store all in the './data'
# folder, creates it if it doesn't exist).
cwdav

# Load a specific configuration file
cwdav "/home/dev/path/config/.cwdav.json"
cwdav .cwdav.json
```

## Configuration

Key | Default value | Description
-|-|-
**port** | `1900` | Port of the server
**container** | `'./data'` | Folder to store the crypted data
**treeFile** | `'$(container)/tree'` | File path in which store the resource tree
**tempTreeFile** | `'$(container)/tree.tmp'` | File path to the temporary resource tree
**treeSeed** | `'tree'` | Seed to use to mix with the global IV to encrypt/decrypt the resource tree file
**salt** | `'this is the salt of the world'` | The salt to use to encrypt/decrypt
**cipher** | `'aes-256-cbc'` | Cipher to use to encrypt/decrypt
**cipherIvSize** | `16` | IV size of the cipher
**hash** | `'sha256'` | Hash algorithm to use for password derivation
**masterNbIteration** | `80000` | Number of hash iteration to get the master key/IV
**minorNbIteration** | `1000` | Number of hash iteration to get the file-specific IV
**keyLen** | `256` | Encryption/descryption key size
