/// <reference path="../../defs/phaser.d.ts" />
import { InteractionZoneUtils } from './InteractionZoneUtils.js'
import {InteractionZone} from './InteractionZone.js';
import {Effects} from './Effects.js';
import {Actions} from './Actions.js';
import {Transitions} from './Transitions.js';
import {Box} from '../Sprites/box.js';

export class Interaction extends Phaser.Physics.Arcade.Group {
    /**
     * Class that manages interactable objects such as switches
     * @param {LevelLoaderScene} scene
     * @param {Array} children
     * @param {*} interactionLayer
     * @param {*} objectMap
     */
    constructor(scene, children, interactionLayer, objectMap, debug) {
        super(scene, children);

        this.effects = new Effects();
        this.actions = new Actions(this);
        this.transitions = new Transitions();  

        this.scene = scene;
        this.tileLayer = interactionLayer;
        /** @type [Array{InteractionZone}] */
        this.zoneLookup = {};
        //Used for monitoring last tiome space was pressed as phaser function only keeps one timer
        this.lastPress = 0;
        this.inExit = false;

        //Create a zone from the tiled object rectangles
        for (let i = 0; i < objectMap.objects.length; i++) {
            let current = objectMap.objects[i];
            //create zone and add to key lookup
            //let z = new InteractionZone(this.scene, current, this, debug);
            let z = InteractionZoneUtils.createZoneGameObject.call(scene, current, this);

            //ADD TO THE GROUP BEFORE SETTING PHYSICS OR THEY WILL BE RESET AND YOU'LL GET A COLLSION BUT IT WON'T STOP YOU!!!
            this.add(z);
            //If there is a blocks property set up collision
            if (z.Blocks) {
                z.body.setImmovable(true); //do this else you pass through
                scene.physics.add.collider(scene.flit, z, this.blocks, this.preBlock, this);
                scene.physics.add.collider(scene.bob, z, this.blocks, this.preBlock, this);
                //if the zone blocks boxes
                if (z.Blocks.key === 'Box') {
                    //Block boxes, rocks and deadweights
                    scene.physics.add.collider(z, scene.mapLayers['Boxes'], this.zoneCollide, this.zoneProcess);
                } else if (z.Blocks.key) {
                    //if properties provided set the relevant one else leave alone so all are checked
                    z.body.checkCollision.up = z.Blocks.key.indexOf('T') !== -1;
                    z.body.checkCollision.right = z.Blocks.key.indexOf('R') !== -1;
                    z.body.checkCollision.down = z.Blocks.key.indexOf('B') !== -1;
                    z.body.checkCollision.left = z.Blocks.key.indexOf('L') !== -1;
                }
                if (!current.visible) z.body.enable = false;
            }
            else {
                if (z.tileType && z.tileType.isBlockActivated) {
                    let a = scene.physics.add.collider(z, scene.mapLayers['Boxes'].getBoxes(), this.zoneProcess, null, this);
                } else {
                    //set up overlap for for player interaction
                    scene.physics.add.overlap(scene.bob, z, this.overZone, null, this);
                    scene.physics.add.overlap(scene.flit, z, this.overZone, null, this);
                }
            }
            this.zoneLookup[current.name] = z;
        }
    }
    /**
     * Process the box hitting a zone 
     * @param {InteractionZone} zone 
     * @param {Box} box 
     */
    zoneProcess(zone, box) {
        if (box.lastContact !== zone) {
            box.lastContact = zone;
            box.deActivate();
            if (box.isBox) box.hits--;
            //console.log(`${box.name} hit ${zone.name}`);
            if (zone.tileType && zone.tileType.isBlockActivated) zone.process(this.scene.game.ActivePlayer);
            return true;
        } else {
            //on same zone
            return false;
        }
    }
    /**
     * 
     * @param {InteractionZone} zone
     * @param {Box} box
     */
    zoneCollide(zone, box) {
        if (box.body) {
            //hit a new zone so set up rules
            box.body.y--;
            box.deActivate();
            if (zone.Moves) {
                box.lockedTo = zone;
            }
        }
    }
    /**
     * Get a zone by it's key
     * @param {string} name Name of zone
     * @returns {InteractionZone} The zone if found or null
     */
    getByKey(name) {
        let f = Object.keys(this.zoneLookup).find(zName => zName === name);
        return this.zoneLookup[f] || null;
    }
    /**
     * Get all zones in a group
     * @param {string} name The GroupKey to get
     * @param {string} exclude The zone name to exclude
     */
    getGroup(name, exclude) {
        if (name === null) return null;
        return Object.entries(Object.filter(this.zoneLookup, (z) => z.hasOwnProperty('GroupKey') && z.GroupKey !== null && z.GroupKey.key && z.GroupKey.key === name && z.name != exclude));
    }
    /**
     * Get the switches in a group
     * @param {string} name The GroupKey to get
     * @param {string} exclude The zone name to exclude
     */
    getGroupSwitches(name,exclude) {
        if (name === null) return null;
        return Object.entries(Object.filter(this.zoneLookup, (z) => z.hasOwnProperty('GroupKey') && z.GroupKey !== null && z.GroupKey.key && z.GroupKey.key === name && z.tileType.isSwitch && z.name != exclude));
    }
    /**
     * Get an average co-ordinate for a group
     * @param {string} name The GroupKey to get
     * @param {string} exclude The zone name to exclude
     * @returns {object} rectangle
     */
    getGroupRectangle(name, exclude) {
        let group = this.getGroup(name, exclude);
        if (group == null) return null;
        let X = [], Y = [];
        for (let i = 0; i < group.length; i++){
            let c = group[i][1]; 
            X.push(c.x);
            X.push(c.x + c.width);
            Y.push(c.y);
            Y.push(c.y + c.height);
        }
        return new Phaser.Geom.Rectangle(Math.min(...X), Math.min(...Y), Math.max(...X) - Math.min(...X), Math.max(...Y) - Math.min(...Y));
    }
    /**
     * Get the rectangle containg the zone
     * @param {string} name Name of the zone
     * @returns {Phaser.Geom.Rectangle} The rectangle containing the InteractionZone
     */
    getTargetRectangle(name) {
        let target = this.getByKey(name);
        if (target) return new Phaser.Geom.Rectangle(target.x, target.y, target.width, target.height);
        return;
    }
    blocks(player, zone) {
        if (zone.constructor.name === 'InteractionContainer') {
            //player is blocked
            if (!player.locked) {
                player.locked = true;
                player.lockedTo = zone;
                zone.playerLocked = true;

                //player.body.velocity.y = 0;
            }
        }
    }
    /**
     * Check to see if the zone affects the player
     * @param {Phaser.GameObjects.Sprite} player The player that has entered the zone
     * @param {InteractionZone} zone The zone that has been entered
     */
    preBlock(player, zone) {
        if (!zone.TutorialShown && zone.Tutorial != null) this.showTooltip(zone);
        //Check if specific player set or block either
        if (zone.Affect === null || zone.Affect.key === null || player.is(zone.Affect.key)) {
            return true;
        }
        return false;
    }
    /**
     * Fired when a player enters a zone
     * @param {Phaser.GameObjects.Sprite} player The player
     * @param {InteractionZone} zone The zone entered
     */
    overZone(player, zone) {
        //check its the active player
        if (player.is(this.scene.ActivePlayer.name)) {
            let t = this.zoneLookup[zone.name];
            //If its an effect require space key
            if (t.Effect === null) {
                if (this.lastPress + 1000 < this.scene.game.loop.lastTime && this.scene.spaceKey.isDown) {
                    this.lastPress = this.scene.game.loop.lastTime;
                    //if affect is supplied make sure its our player
                    if (t.Affect === null || (t.Affect !== null && t.Affect.key === player.name)) {
                        zone.process(player, true);
                    }
                }
            } else {
                //else fire constantly
                zone.process(player, true);
            }
        }
        if (!this.inExit && zone.name === 'Exit') {
            //check both Flit and Bob are here
            if (zone.body.hitTest(this.scene.bob.x, this.scene.bob.y) && zone.body.hitTest(this.scene.flit.x, this.scene.flit.y)) {
                this.inExit = true;
                this.scene.levelEvents.emit('levelcomplete');
            }
        }
        if (!zone.TutorialShown && zone.Tutorial != null) this.showTooltip(zone);
    }

    showTooltip(zone) {
        let p = this.scene.ActivePlayer;
        //let g = this.scene.add.graphics({x:0, y:0}).setDepth(p.depth -1);
        let t = this.scene.add.text(0, 0, zone.Tutorial.key, {
            font: '14px Arial',
            fill: '#000000',
            wordWrap: { width: 280 }
        });
        t.setOrigin(0);

        let g = this.scene.game.cartoonBox(this.scene, 0, 0, 300, t.height);
        g.setDepth(p.depth - 1);
        t.setPosition(p.body.left + 10, ((p.body.top - p.displayHeight) + 10), 300, t.height + 20);
        t.depth = g.depth + 1;
        g.setPosition(p.body.left, (p.body.top - p.displayHeight), 300, t.height + 20);

        zone.TutorialShown = true;

        this.scene.time.delayedCall(5000, (t, g) => { t.destroy(); g.destroy(); }, [t, g], this);
    }
    /**
     * Process the action from the zone
     * @param {InteractionZone} triggerZone The zone information built from the map
     * @param {Phaser.GameObjects.Sprite} player The player in the zone
     */
    action(triggerZone, player) {
        if (triggerZone.Action !== null) {
            this.runAction(triggerZone.Action.key, [triggerZone, player]);
        }
        if (triggerZone.Effect !== null) {
            this.runEffect(triggerZone.Effect.key, [triggerZone, player]);
        }
    }
    /**
     * Run the action defined in the zone
     * @param {string} name Name of the action
     * @param {Array} args Array of arguments
     */
    runAction(name, args) {
        if (name !== null) {
            let instance = this.actions.action[name];
            if (instance)
                try {
                    return instance.apply(this, args);
                } catch (e) {
                    console.error(e);
                }
            else
                console.log(name + ` action not found`);
        }
    }
    /**
    * Run the effect defined in the zone
    * @param {string} name Name of the action
    * @param {Array} args Array of arguments
    */
    runEffect(name, args) {
        if (name !== null) {
            let instance = this.effects.effect[name];
            if (instance)
                try {
                    return instance.apply(this, args);
                } catch (e) {
                    console.error(e);
                }
            else
                console.log(name + ` effect not found`);
        }
    }
    /**
     * Run the transition defined in the zone
     * @param {string} name Name of the action
     * @param {Array} args Array of arguments
     */
    runTransition(name, args) {
        if (name !== null) {
            let instance = this.transitions.transition[name];
            if (instance)
                try {
                    return instance.apply(this, args);
                } catch (e) {
                    console.error(e);
                }
            else
                console.log(name + ` transition not found`);
        }

    }
    getTargetZone(name) {
        return this.zoneLookup[name];
    }
}