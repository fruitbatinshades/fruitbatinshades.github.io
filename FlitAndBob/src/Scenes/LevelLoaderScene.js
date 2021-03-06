/// <reference path="../../defs/phaser.d.ts" />
import { Level } from '../Levels/Level.js';

/**
 * Scene that loads a level with a progress bar.
 */
export class LevelLoaderScene extends Phaser.Scene {
    constructor() {
        super('LevelLoader');
    }
    preload() {
        //get the name of the scene to start from the querystring if there
        if (this.registry.has('urlLevel') && this.registry.get('urlLevel') !== null) {
            this.registry.set('currentLevel', this.registry.get('urlLevel'));
        } else {
            this.registry.set('currentLevel', this.game.levels[this.game.levelIndex]);
        }

        this.progressBar = this.add.graphics();
        this.progressBar.depth = 11;
        this.progressBox = this.add.graphics();
        this.progressBox.depth = 10;

        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        //add and resize splash to best fit
        let splash = this.add.image(0, 0, 'SplashBackground');
        let size = new Phaser.Structs.Size(this.width, this.height);
        let splashSize = new Phaser.Structs.Size(splash.width, splash.height, Phaser.Structs.Size.ENVELOP, size)
        splashSize.setSize(size.width, size.height);
        splash.setDisplaySize(splashSize.width, splashSize.height);
        splash.x = this.width / 2;
        splash.y = this.height / 2;

        let logo = this.add.image(this.width / 2, this.height / 2, 'Logo');

        this.left = this.width / 2 - 200;
        this.progressBox.lineStyle(6, 0x333333, 1);
        this.progressBox.strokeRoundedRect(this.left - 3, 267, 411, 56, 7);
        this.progressBox.fillStyle(0x36B5F5, 1);
        this.progressBox.fillRoundedRect(this.left, 270, 406, 50, 6);


        //this.add.image(width / 2, 100, 'Logo');
        this.PlayButton = this.add.image(this.width / 2, 490, 'UI', 'roundButton');
        this.PlayButton.alpha = .5;
        this.PlayButton.setInteractive();
        let p = this.add.image(this.width / 2, 490, 'UI', 'play');
        p.setOrigin(.5, .5);

        this.loadingText = this.make.text({
            x: this.width / 2,
            y: this.height / 2 - 60,
            text: 'Loading...',
            style: {
                font: '30px HvdComic',
                fill: '#ffffff'
            }
        });
        this.loadingText.setOrigin(0.5, 0.5);

        this.percentText = this.make.text({
            x: this.width / 2,
            y: this.height / 2 - 5,
            text: '0%',
            style: {
                font: '28px HvdComic',
                fill: '#ffffff'
            }
        });
        this.percentText.setOrigin(0.5, 0.5).depth = 13;

        this.assetText = this.make.text({
            x: this.width / 2,
            y: this.height / 2 + 50,
            text: '',
            style: {
                font: '28px HvdComic',
                fill: '#ffffff'
            }
        });

        this.assetText.setOrigin(0.5, 0.5);

        this.game.cartoonText(this.loadingText);
        this.game.cartoonText(this.percentText);
        this.game.cartoonText(this.assetText);

        this.load.on('progress', function (value) {
            this.percentText.setText(parseInt(value * 100) + '%');
            this.progressBar.clear();
            this.progressBar.fillStyle(0xC6E5FA, 1);
            this.progressBar.fillRoundedRect(this.left + 6, 278, 394 * value, 36, 7);
        }, this);

        this.load.on('fileprogress', function (file) {
            this.assetText.setText('Loading : ' + file.key);
            //console.log(file.key);
        }, this);

        this.load.on('complete', function () {
            this.progressBar.destroy();
            this.progressBox.destroy();
            this.loadingText.destroy();
            this.percentText.destroy();
            this.assetText.destroy();
        }, this);
        this.PlayButton.on('pointerdown', function () {
            if (this.scene.get('Level') !== null) {
                this.scene.get('Level').scene.restart('Level');
                this.scene.sendToBack(this);
            } else {
                this.scene.add('Level', new Level('Level', this.registry.get('currentLevel')), true);
            }
            this.scene.pause(this);
        }, this);

        this.load.once('filecomplete', this.mapLoaded, this);
        this.load.tilemapTiledJSON(this.registry.get('currentLevel'), `assets/Levels/${this.registry.get('currentLevel')}.json`);
    }
    create() {
        let n = this.make.text({
            x: this.cameras.main.width / 2,
            y: 420,
            text: 'Play ' + this.registry.get('currentLevel'),
            style: {
                font: '28px HvdComic',
                fill: '#ffffff'
            }
        });
        n.setOrigin(.5);
        this.game.cartoonText(n);
        this.PlayButton.alpha = 1;
    }
    levelFinished() {
        this.scene.stop('HUD');
        if (this.game.levels.length > this.game.levelIndex + 1) this.game.levelIndex++;
        this.scene.bringToTop(this);
        this.scene.stop('Level');
        this.scene.start();
    }
    mapLoaded() {
        this.load.audioSprite('sfx', 'assets/Sound/FlitBob.json', [
            'assets/Sound/FlitBob.ogg',
            'assets/Sound/FlitBob.mp3'
        ]);
        console.log('map loaded');
        // create the map in the scene
        this.map = this.make.tilemap({ key: this.registry.get('currentLevel') });
        //load backgrounds from map.properties.Backgrounds (Pipe delimeted filename from tiled)
        this.load.setPath('assets/Levels/Backgrounds/');
        this.map.properties["Backgrounds"].split('|').forEach((b) => {
            let name = b.substr(0, b.lastIndexOf('.'));
            b.endsWith('.svg') ? this.load.svg(name, b) : this.load.image(name, b);
        });

        //load tilesets
        this.load.setPath('assets/Levels/');
        this.map.tilesets.forEach((b) => {
            this.load.image(b.name);
            //console.log(b.name);
        });
    }
}