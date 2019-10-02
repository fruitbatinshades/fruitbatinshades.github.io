export const config  = {
    type: Phaser.AUTO,
    width: 1024,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {y: 500},
            debug: false,
            overlapBias: 8,
            tileBias:16,
            debug: window.location.hostname.includes('127.0.0.1')
        }
    },
    version:"0.1.05"
};