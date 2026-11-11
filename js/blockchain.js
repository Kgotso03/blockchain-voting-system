// ============================================================
// SHA-256 Pure JavaScript Implementation
// ============================================================
function sha256(message) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiBitLength = message[lengthProperty] * 8;
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    message += '\x80';
    while (message[lengthProperty] % 64 - 56) message += '\x00';
    for (i = 0; i < message[lengthProperty]; i++) {
        j = message.charCodeAt(i);
        if (j >> 8) return;
        words[i >> 2] |= j << ((3 - i) % 4 * 8);
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength);
    for (j = 0; j < words[lengthProperty];) {
        var w = words.slice(j, j += 16);
        var oldHash = hash.slice(0);
        for (i = 0; i < 64; i++) {
            var w15 = w[i - 15], w2 = w[i - 2];
            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0);
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
            hash.length = 8;
        }
        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }
    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    // Reset for next call
    sha256.h = null;
    sha256.k = null;
    return result;
}

// ============================================================
// Block Class
// ============================================================
class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; // { type: 'VOTE'|'REGISTER_VOTER'|'ADD_CANDIDATE', payload: {...} }
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return sha256(
            this.index +
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.data) +
            this.nonce
        );
    }

    mineBlock(difficulty) {
        const target = Array(difficulty + 1).join('0');
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        return this.hash;
    }
}

// ============================================================
// Blockchain Class
// ============================================================
class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
    }

    createGenesisBlock() {
        return new Block(
            0,
            new Date('2024-01-01T00:00:00Z').toISOString(),
            {
                type: 'GENESIS',
                payload: {
                    message: 'Blockchain Voting System Genesis Block',
                    version: '1.0.0'
                }
            },
            '0000000000000000000000000000000000000000000000000000000000000000'
        );
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(data) {
        const newBlock = new Block(
            this.chain.length,
            new Date().toISOString(),
            data,
            this.getLatestBlock().hash
        );
        newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);
        return newBlock;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Recalculate hash to verify
            const recalculated = sha256(
                currentBlock.index +
                currentBlock.previousHash +
                currentBlock.timestamp +
                JSON.stringify(currentBlock.data) +
                currentBlock.nonce
            );

            if (currentBlock.hash !== recalculated) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    getVotesByCandidate(candidateId) {
        return this.chain.filter(block =>
            block.data.type === 'VOTE' &&
            block.data.payload.candidateId === candidateId
        ).length;
    }

    hasVoterVoted(walletAddress, category = null) {
        return this.chain.some(block =>
            block.data.type === 'VOTE' &&
            block.data.payload.voterWallet === walletAddress &&
            (!category || (block.data.payload.category || 'General') === category)
        );
    }

    isVoterRegistered(walletAddress) {
        return this.chain.some(block =>
            block.data.type === 'REGISTER_VOTER' &&
            block.data.payload.walletAddress === walletAddress
        );
    }

    getAllVotes() {
        return this.chain.filter(block => block.data.type === 'VOTE');
    }

    getVoterTransaction(walletAddress, category = null) {
        return this.chain.find(block =>
            block.data.type === 'VOTE' &&
            block.data.payload.voterWallet === walletAddress &&
            (!category || (block.data.payload.category || 'General') === category)
        );
    }

    getVoterTransactions(walletAddress) {
        return this.chain.filter(block =>
            block.data.type === 'VOTE' &&
            block.data.payload.voterWallet === walletAddress
        );
    }

    exportChain() {
        return JSON.stringify(this.chain, null, 2);
    }

    // Serialize for localStorage
    serialize() {
        return JSON.stringify(this.chain);
    }

    // Deserialize from localStorage
    static deserialize(data) {
        const bc = new Blockchain();
        const parsed = JSON.parse(data);
        bc.chain = parsed.map(blockData => {
            const block = new Block(
                blockData.index,
                blockData.timestamp,
                blockData.data,
                blockData.previousHash
            );
            block.nonce = blockData.nonce;
            block.hash = blockData.hash;
            return block;
        });
        return bc;
    }
}
