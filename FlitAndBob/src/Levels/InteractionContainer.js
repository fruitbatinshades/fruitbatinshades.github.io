import { Utils } from '../Utils/Utils.js'
import { InteractionZoneUtils } from './InteractionZoneUtils.js'
import { InteractionParams } from './InteractionZoneUtils.js'

export class InteractionContainer extends Phaser.GameObjects.Container {
    get isActive() {
        return this._isActive;
    }
    set isActive(value) {
        this._isActive = value;
        if (this.Moves && this.Moves.tween) {
            if (this.Moves.tween.isPlaying()) {
                this.Moves.tween.pause();
            }
            else {
                this.Moves.tween.resume();
            }
        }
    }

    constructor(scene, tileObj, interaction, debug) {
        super(scene, tileObj.x, tileObj.y);

        //Whether the target has been shown to the camera so it only happens once
        this._groupShown = false;

        //this.setOrigin(0);
        this.scene.add.existing(this);
        //force size
        this.setSize(tileObj.width, tileObj.height);
        this.setDisplaySize(tileObj.width, tileObj.height);

        scene.physics.world.enable(this);
        this.body.moves = false;
        this.body.immovable = true;
        //Append tiled properties to this class, different target classes also have these properties
        InteractionZoneUtils.appendTiledProperties.call(this, tileObj);
        InteractionZoneUtils.adjustBody.call(this);

        // //Containers don't allow origin changes so do it manually
        // this.x += this.width * .5;
        // this.y += this.height * .5;

        //The properties are intially null and only set up if the KV pair is in the properties
        if (tileObj.properties) {
            if (typeof tileObj.properties.Moves !== 'undefined') {
                //This really need to be an entirely seperate object
                this.Moves = new InteractionParams(tileObj.properties.Moves);
                this.createMovable();
            }
        }

        scene.movables.add(this);
    }
    /** Create a moveable container and bind to the zone */
    createMovable() {
        let tiles = this.getVisibleTiles(this.scene);
        //convert the tiles to sprites before we adjust the container position
        let s = Utils.TileAreaToSprites(tiles, { key: 'ComponentSheet' }, this.scene.mapLayers['InteractionTiles']);
        //remove the original tiles
        tiles.forEach(t => {
            this.scene.mapLayers['InteractionTiles'].removeTileAt(t.x, t.y)
        });

        //adjust the position at this point until we figure out how to set origin to 0 on containers
        //TODO: Find out how to set container origin to 0,0
        this.x += this.width * .5;
        this.y += this.height * .5;

        //adjust origin and position to match use case
        s.forEach((x, i) => {
            x.setOrigin(0);
            //set co-ords to be relative to the container
            x.x -= this.x;
            x.y -= this.y;
        });
        //this.depth = 100;
        this.add(s);

        //TODO: solidify this
        let t = {
            targets: this,
            repeat: -1,
            ease: 'Linear',
            yoyo: true,
            paused: !this.isActive
        };
        if (this.Moves.params.y) t.y = this.y + this.Moves.params.y;
        if (this.Moves.params.x) t.x = this.x + this.Moves.params.x;
        if (this.Moves.params.speed) {
            t.duration = this.Moves.params.speed;
            t.hold = this.Moves.params.hold || this.Moves.params.speed;
        }

        this.Moves.tweenDef = t;
        this.Moves.tween = this.scene.tweens.add(this.Moves.tweenDef);
        this.Moves.tween.play();

        //this.scene.levelEvents.emit('movableCreated', this.Moves);
    }
    /**
     * Get the tiles from the InteractionTiles layer
     * @param {LevelLoaderScene} scene The scene to use
     * @param {bool} includeSwitches Include the Enum.isSwitch tiles
     */
    getVisibleTiles(scene, includeSwitches, tileLayer) {
        if (includeSwitches) {
            return scene.map.getTilesWithinWorldXY(this.x, this.y, this.tileObj.width, this.tileObj.height, (t) => {
                return true;
            }, scene.cameras.main, tileLayer || 'InteractionTiles');
        } else {
            return scene.map.getTilesWithinWorldXY(this.x, this.y, this.tileObj.width, this.tileObj.height, (t) => {
                return x => !this.scene.switchIds.contains(t.index)
            }, scene.cameras.main, tileLayer || 'InteractionTiles');
        }
    }
}