import { InteractionZoneUtils } from './InteractionZoneUtils.js'

/**
 * Class populated from the tilemap Interaction Layer rectangles
 * @member {int} tileType the type of tile under the zone (tilemaps.js > )
 * @member {Phaser.Tilemaps.Tile} tileObj Ref to the map obj
 * @member {InteractionParams} Target Single target ID
 * @member {InteractionParams} GroupKey Key to group multiple targets
 * @member {InteractionParams} Action The action to use when client is over the zone and presses space (Show/Hide)
 * @member {InteractionParams} Effect The effect to use on the player (injure)
 * @member {InteractionParams} Transition The visual effect to use (toggleVisibility, fadeAndDisable)
 * @member {InteractionParams} Implementation Class to use for this tile (not implemented)
 * @member {InteractionParams} Affect What player does it affect (flit, bob)
 * @member {InteractionParams} Blocks Whether it blocks (physics)
 */
export class InteractionZone extends Phaser.GameObjects.Zone {
    //I have reached the point where interfaces would be really useful :/
    get switchOn() {
        return this._switchOn;
    }
    set switchOn(value) {
        this._switchOn = value;
        //chain related switches
    }
    get isActive() {
        return this._isActive;
    }
    set isActive(value) {
        this._isActive = value;
    }

    constructor(scene, tileObj, interaction, debug) {
        super(scene, tileObj.x, tileObj.y , tileObj.width , tileObj.height );
        
        if (tileObj.name === null || tileObj.name === '')
            throw `Zone at ${tileObj} does not have a name`;

        this.interaction = interaction;
        //this.properties = tileObj.properties;
        this.tileType;
        this._isActive = true;
        this._switchOn = false;
        //Whether the target has been shown to the camera so it only happens once
        this._groupShown = false;
        
        this.setOrigin(0);
        scene.physics.world.enable(this);
        this.body.setAllowGravity(false).moves = false;
        this.body.immovable = true;

        
        //Append tiled properties to this class, different target classes also have these properties
        InteractionZoneUtils.appendTiledProperties.call(this, tileObj);
        InteractionZoneUtils.adjustBody.call(this);

        //hide tiles if the zone not visible in Tiled
        if (!tileObj.visible) {
            this.getVisibleTiles(scene).forEach(x => x.visible = false);
            this.active = false;
            this.isActive = false;
        }
        
        //TODO: strip this out on build ???
        //Add tooltips on debug to show the properties from Tiled
        if (debug) {
            scene.add.text(tileObj.x, tileObj.y, tileObj.name, {
                font: '10px monospace',
                fill: '#000000'
            }).setShadow(2, 2, '#333333', 2, true, false)
                .setStroke('#FFFFFF', 3)
                .setFontStyle('bold').depth = 999;
            let props = scene.add.text(0, 0, JSON.stringify(tileObj.properties, null, 4), {
                font: '8px monospace',
                fill: '#000000'
            });
            let r = scene.add.rectangle(0, 0, props.width + 8, props.height + 8, 0xFFFFFF).setOrigin(0);
            let t = scene.add.container(tileObj.x, tileObj.y - 15, [r, props]);
            t.depth = 998;
            t.y = this.y - r.height;
            t.visible = false;
            this.toolInfo = t;
            this.setInteractive();

            this.scene.events.on('preupdate', this.preUpdate, this);
        }
        //this.scene.events.on('preupdate', this.preUpdate, this);
    }
    preUpdate() {
        if(this.scene && this.scene.game && this.scene.game.debugOn)
            this.scene.game.objs.push(this);
    }
  
    process(player, iterateGroup, parent) {
        InteractionZoneUtils.process.apply(this, [player, iterateGroup, parent]);
    }

    /**
     * Get the tiles from the InteractionTiles layer
     * @param {LevelLoaderScene} scene The scene to use
     * @param {bool} includeSwitches Include the Enum.isSwitch tiles
     */
    getVisibleTiles(scene, includeSwitches, tileLayer) {
        if (includeSwitches) {
            return scene.map.getTilesWithinWorldXY(this.x, this.y, this.width, this.height, (t) => {
                return true;
            }, scene.cameras.main, tileLayer || 'InteractionTiles');
        } else {
            return scene.map.getTilesWithinWorldXY(this.x, this.y, this.width, this.height, (t) => {
                return x => !this.scene.switchIds.contains(t.index)
            }, scene.cameras.main, tileLayer || 'InteractionTiles');
        }
    }
   
}