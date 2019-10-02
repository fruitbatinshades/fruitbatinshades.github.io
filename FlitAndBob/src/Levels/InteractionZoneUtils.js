import { Utils } from '../Utils/Utils.js'
import { InteractionZone } from './InteractionZone.js'
import { InteractionContainer } from './InteractionContainer.js'

//Normal InteractionZones are just zone thats provide interaction over tile maps so are based on Zones
//Moving InteractionZones will convert the tiles to sprites and remove the tiles from the map.
export class InteractionZoneUtils {
    /**
     * Call with `InteractionZoneUtils.createZoneGameObject.call([this|scene], tileObj, interaction)`
     * @param {*} tileObj 
     * @param {*} interaction 
     */
    static createZoneGameObject(tileObj, interaction) {
        let createdZone;
        if (tileObj.properties && tileObj.properties.Moves) {
            //this is a moving object so has different rules
            createdZone = new InteractionContainer(this, tileObj, interaction);
        } else {
            createdZone = new InteractionZone(this, tileObj, interaction);
        }
        return createdZone;
    }
    /**
     * Different properties can create different classes but the properties should be the same across them so add them to the 
     * class that is passed in.
     * @param {object} tileObj The tile opbject with extended properties
     */
    static appendTiledProperties(tileObj) {
        //Unique name of the zone
        this.name = tileObj.name;
        this.tileObj = tileObj;
        this.TutorialShown = false;

        //check if properties defined so we can use ternary to crete null property
        let topd = (typeof tileObj.properties !== 'undefined');
        if (topd && typeof tileObj.properties.isActive !== 'undefined')
            this.isActive = tileObj.properties.isActive;
        else
            this.isActive = true;

        /*
        * N.B. The properties are always created and intially set to null and only populated if the KV pair is in the properties.
        * this is reduce `undefined` checks in the processing code. Just check for 'zone.Action != null` etc.  This is a bad pattern
        * and I will get back to it, but was less complicated.
        */
        this.GroupKey = (topd && tileObj.properties.GroupKey !== undefined) ? new InteractionParams(tileObj.properties.GroupKey) : null;
        this.Target = (topd && tileObj.properties.Target !== undefined) ? new InteractionParams(tileObj.properties.Target) : null;
        this.Affect = (topd && tileObj.properties.Affect !== undefined) ? new InteractionParams(tileObj.properties.Affect) : null;
        this.Action = (topd && tileObj.properties.Action !== undefined) ? new InteractionParams(tileObj.properties.Action) : null;
        this.Effect = (topd && tileObj.properties.Effect !== undefined) ? new InteractionParams(tileObj.properties.Effect) : null;
        this.Transition = (topd && tileObj.properties.Transition !== undefined) ? new InteractionParams(tileObj.properties.Transition) : null;
        this.Implementation = (topd && tileObj.properties.Implementation !== undefined) ? new InteractionParams(tileObj.properties.Implementation) : null;
        this.Blocks = (topd && tileObj.properties.Blocks !== undefined) ? new InteractionParams(tileObj.properties.Blocks) : null;
        this.DeadWeight = (topd && tileObj.properties.DeadWeight !== undefined) ? new InteractionParams(tileObj.properties.DeadWeight) : null;
        this.Tutorial = (topd && tileObj.properties.Tutorial !== undefined) ? new InteractionParams(tileObj.properties.Tutorial) : null;
    }
    /** adjust the zones dimensions for the tile state */
    static adjustBody() {
        //the tile on the switch layer to see what type it is
        let tile = this.scene.map.getTileAt(this.tileObj.x / 64, this.tileObj.y / 64, false, 'InteractionTiles');
        if (tile !== null) {
            this.tileType = this.scene.switchIds.tileType(tile.index);
            //adjust zone height for component
            let za = this.scene.switchIds.ZoneAdjust[tile.index];
            if (za) {
                //console.log(tile.index, za);
                if (za.hasOwnProperty('h'))
                    this.body.height = za.h;
                if (za.hasOwnProperty('w'))
                    this.body.width = za.w;
                if (za.hasOwnProperty('y'))
                    this.body.y = tile.pixelY + za.y;
                if (za.hasOwnProperty('x'))
                    this.body.x = tile.pixelX + za.x;
                this.body.reset(this.body.x, this.body.top);
            }
        }
        //if ZoneHeight is provided adjust the zone, used to make the zone smaller than the tile (switches, injure)
        //This will overwrite the defaults if set
        if (this.tileObj && this.tileObj.properties && this.tileObj.properties.ZoneHeight) {
            if (this.tileObj.properties.ZoneHeightAt) {
                switch (this.tileObj.properties.ZoneHeightAt) {
                    case 'T':
                        this.body.reset(this.body.x, this.body.top);
                        break;
                    default:
                        this.body.reset(this.body.x, this.body.bottom - parseInt(this.tileObj.properties.ZoneHeight));
                        break;
                }
            } else {
                this.body.reset(this.body.x, this.body.bottom - parseInt(this.tileObj.properties.ZoneHeight));
            }
            this.body.height = parseInt(this.tileObj.properties.ZoneHeight);
        }
    }

    // /**
    //  * Get the tiles from the InteractionTiles layer
    //  * @param {LevelLoaderScene} scene The scene to use
    //  * @param {bool} includeSwitches Include the Enum.isSwitch tiles
    //  */
    // static getVisibleTiles(scene, includeSwitches, tileLayer) {
    //     if (includeSwitches) {
    //         return scene.map.getTilesWithinWorldXY(this.x, this.y, this.width, this.height, (t) => {
    //             return true;
    //         }, scene.cameras.main, tileLayer || 'InteractionTiles');
    //     } else {
    //         return scene.map.getTilesWithinWorldXY(this.x, this.y, this.width, this.height, (t) => {
    //             return x => !this.scene.switchIds.contains(t.index)
    //         }, scene.cameras.main, tileLayer || 'InteractionTiles');
    //     }
    // }

    /**
   * Process this zone and its related ones
   * @param {Player} player player in zone
   * @param {bool} iterateGroup Only set this on the trigger zone else you'll get an endless loop and stack overflow
   */
    static process(player, iterateGroup, parent) {
        if (this.isActive) {
            //     this.State = !this.State;
            this.body.debugBodyColor = !this.State ? 0xFF0000 : 0x00FF00;

            //get the target zone
            let target;
            if (this.Target !== null && this.Target.key !== null) {
                target = this.interaction.getByKey(this.Target.key);
            }

            //If its a switch, change its state
            if (this.tileType && this.tileType.isSwitch) {
                let switchTile = this.scene.map.getTileAt(this.tileObj.x / 64, this.tileObj.y / 64, false, 'InteractionTiles');
                switchTile.index = this.interaction.scene.switchIds.switchState(switchTile.index, this);
                this.scene.sound.playAudioSprite('sfx', 'switch');
                InteractionZoneUtils.adjustBody.call(this);
                let panRect;
                //pan if the target or group is off screen
                if (target && !this._groupShown) {
                    panRect = this.interaction.getTargetRectangle(target.name);
                }
                if (this.GroupKey !== null && this.GroupKey.key !== null && this.GroupKey.key !== '') {
                    if (!this._groupShown) {
                        //Pan the camera to the target if it's off screen
                        panRect = this.interaction.getGroupRectangle(this.GroupKey.key, this.name);
                    }
                }
                if (panRect) {
                    if (!Phaser.Geom.Rectangle.ContainsRect(this.scene.cameras.main.worldView, panRect)) {
                        this.scene.shiftKey.enabled = false;
                        Utils.panAndReturn(this.scene, panRect, () => { this.scene.shiftKey.enabled = true });
                    }
                    this._groupShown = true;
                }
            }

            //if its an action or effect
            if (this.Action !== null || this.Effect !== null) {
                this.interaction.action(parent || this, player);
            } else if (parent) {
                if (parent.Action != null || parent.Effect !== null) {
                    this.interaction.action(parent, player);
                }
            }
            //if it has a transition
            if (target && this.Transition !== null && this.Transition.key !== null) {
                let tiles = target.getVisibleTiles(this.interaction.scene);
                if (tiles.length != 0) {
                    this.interaction.runTransition(this.Transition.key, [tiles, this]);
                }
            }
            // if (this.Implementation !== null) {
            // }
        }
    }
}

/** 
 * Converts the Tiled property to its value and properties (if supplied) 
 * */
export class InteractionParams {
    constructor(value) {
        this.has.key = null;
        this.params = {};
        this.splitMapProperty(value);
    }
    /**
     * Whether the object from tiled has a propety named 'name'
     * @param {string} name the property to check for
     */
    has(name) {
        if (this.params === null) return false;
        return this.params.hasOwnProperty(name);
    }
    /**
     * Splits the string property from tiled map
     * @param {string} value Value from the tiled custom properties
     */
    splitMapProperty(value) {
        //if the property has a brace, extract json
        if (!value.endsWith('}')) {
            this.key = value;
            if (this.key === '') this.key = null;
        } else {
            //contains json properties
            let firstBrace = value.indexOf('{');
            let s = value.substring(firstBrace);
            this.params = JSON.parse(s);
            value = value.substring(0, firstBrace);

            if (value === '') value = null;
            this.key = value;
        }
    }
}