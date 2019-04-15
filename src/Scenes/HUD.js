/// <reference path="../../defs/phaser.d.ts" />
/**
 * thE hEADS UP DISPLAY FOR HEALTH AND SCORE
 */
export default class HUD extends Phaser.Scene {
    containingScene = null;
    constructor() {
        super({ key: 'HUD', active: true });
    }

    create() {

        //  Grab a reference to the Game Scene
        let lvl = this.scene.get('Level');

        this.add.rectangle(170, 50, 300, 90, 0xFFFFFF).alpha = .7;
        this.add.rectangle(168, 48, 304, 94).setStrokeStyle(6, 0x666666);;
        //flit
        this.add.image(64, 28, 'flit', 1).setScale(.35).tint = 0x000000;
        this.add.image(62, 26, 'flit', 1).setScale(.35);
        this.flitHealth = this.add.text(100, 10, '100 %', { font: '20px Arial', fill: '#FFFFFF' });
        this.setStroke(this.flitHealth);
        //flies
        this.add.image(195, 28, 'ComponentSheet', 31).setScale(.65).tint = 0x000000;
        this.add.image(193, 26, 'ComponentSheet', 31).setScale(.65);
        this.fliesCollected = this.add.text(220, 10, '0 / ' + lvl.totalFlies, { font: '20px Arial', fill: '#FFFFFF' });
        this.setStroke(this.fliesCollected);

        //Bob
        this.add.image(64, 72, 'bob', 1).setScale(.35).tint = 0x000000;
        this.add.image(62, 70, 'bob', 1).setScale(.35);
        this.bobHealth = this.add.text(100, 56, '100 %', { font: '20px Arial', fill: '#FFFFFF' });
        this.setStroke(this.bobHealth);
        //shrooms
        this.add.image(195, 70, 'ComponentSheet', 30).setScale(.55).tint = 0x000000;
        this.add.image(193, 68, 'ComponentSheet', 30).setScale(.55);
        this.shroomsCollected = this.add.text(220, 56, '0 / ' + lvl.totalShrooms, { font: '20px Arial', fill: '#FFFFFF' });
        this.setStroke(this.shroomsCollected);

        //  Listen for events from it
        lvl.events.on('updateHUD', function (player) {
            if (player.is('Bob')) {
                this.bobHealth.text = parseInt((player.health / 100) * 100) + ' %';
                this.shroomsCollected.text = player.collected + ' / ' + lvl.totalShrooms;
            }
            else if (player.is('Flit')) {
                this.flitHealth.text = parseInt((player.health / 50) * 100) + ' %';
                this.fliesCollected.text = player.collected + ' / ' + lvl.totalFlies;
            }
        }, this);
    }
    setStroke(txt) {
        txt.setShadow(2, 2, '#333333', 2, true, false)
            .setStroke('#0066AA', 3)
            .setFontStyle('bold');
    }
}