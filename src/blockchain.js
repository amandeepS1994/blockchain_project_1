/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
           // check the data is valid
           if (block) {
                // Append the Block Time & hash
                block.time = new Date().getTime().toString().slice(0,-3);
                block.hash = SHA256(JSON.stringify(block)).toString();

                if (this.chain.length > 0) {
                    let previousBlock = this.chain[this.chain.length-1];
                    block.height = previousBlock.height + 1;
                    block.previousBlockHash = previousBlock.hash;

                    // validate chain before the block has been appended.
                    // Given valid, append the block otherwise reject
                    this.validateChain()
                    .then((state) => state ? resolve (this._appendBlockOntoTheChain(block)) : reject ("Chain Invalid"))
                    .catch((error) => reject("Chain Invalid"));

                }  else {
                    // append Genesis Block onto the chain
                    this._appendGenesisBlock(block) ? resolve (block): reject("Failed to Append Genesis Block");
            }   
           } else {
            reject(block);
           }
        });
    }

    _appendGenesisBlock(block) {
        // Logic for Genesis Block if required
        console.log("Appending Genesis Block");
        return this._appendBlockOntoTheChain(block);
    }

    _appendBlockOntoTheChain(block) {
        this.chain.push(block);
        this.height = this.chain.length;
        console.log(block);
        return block;
    }



    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            resolve(`${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            // current time
            let messageTime = parseInt(message.split(':')[1]);
            let currentTime =  parseInt(new Date().getTime().toString().slice(0,-3));
            bitcoinMessage.verify(message, address, signature);
            if (new Date((currentTime - messageTime)).getMinutes() < 5 && bitcoinMessage.verify(message, address, signature)) {
                let newBlock = new BlockClass.Block({
                    "message": message,
                    "signature": signature,
                    "star": star,
                });
                this._addBlock(newBlock);
                resolve(newBlock);
            } else {
                reject("Failed to Submit Star");
            }
            
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            let foundBlock = this.chain.find((block) => block.hash === hash);
            foundBlock ? resolve(foundBlock) : reject("Block Not Found.");
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            if (this.chain.length > 0) {
                this.chain.forEach((block) => 
                        block.getBData()
                            .then((value) => {
                                if (value?.message.split(':')[0] === address) {
                                    stars.push({
                                        "owner": address,
                                        "star": value?.star
                                    });
                                }
                            }, (error) => {
                                console.log(`Block issue: ${error}`);
                            }).catch(() => {
                                reject("Failed.");
                            }));
            resolve(stars);
            } else {
                reject("Failed.");
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        let previousHash = null;
        return new Promise(async (resolve, reject) => {
            if (this.chain.length > 0) {
                // for each block
                Promise.all([
                    this.chain.forEach((block) => {
                        // determine if the body is altered.
                        // validate the Block's hash and record any errors.
                        block.validate()
                            .then((state) => {
                                if (!state) {
                                    errorLog.push({
                                        "Block's Hash" : block.hash,
                                        "Error": "Block's Body has been altered."
                                    });
                                }
                            }, (err) => errorLog.push({
                                "Block's Hash": block.hash,
                                "Error": `Block Validation Failed (${err})`
                            })).catch((error) => errorLog.push({
                                "Block's Hash": block.hash,
                                "Error": `Failed Validating Block (${error})`
                            }));
                        
                        // Compare the previous Block's hash.
                        // comparing block;s hashes
                        if (!this._comparePreviousBlockHash(block, previousHash)) {
                            errorLog.push({
                                "Block's Hash": block.hash,
                                "Error": `Hash Not Matching: Previous Hash: ${previousHash} \n Block Hash ${block.hash}`});
                        }

                         // assign previousHash to block's hash
                        previousHash = block?.hash;
                    })
                ]);
                    
            } else {
                // no block present on the chain.
                errorLog.push({
                    "Error": "No Block Present on the Chain."
                });
            }
            // return the error logs.
            resolve(errorLog);
        });
    }

    _comparePreviousBlockHash(block, previousBlockHash) {
        return block.previousBlockHash === previousBlockHash;
    }

}



module.exports.Blockchain = Blockchain;   