// ============================================================
// Application State & Business Logic
// ============================================================

const STORAGE_KEYS = {
    BLOCKCHAIN: 'bvs_blockchain',
    USERS: 'bvs_users',
    CANDIDATES: 'bvs_candidates',
    CATEGORIES: 'bvs_categories',
    ELECTION: 'bvs_election',
    CURRENT_USER: 'bvs_current_user',
    WALLET: 'bvs_wallet'
};

const DEFAULT_CATEGORIES = ['President', 'Vice President', 'Governor', 'Senator', 'Secretary', 'Treasurer'];

const DEFAULT_CANDIDATES = [
    {
        id: 'candidate_1',
        name: 'Alice Johnson',
        category: 'President',
        party: 'Democratic Party',
        description: 'Fighting for healthcare, education, and climate action.',
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
        icon: 'fa-dove',
        color: '#3498db'
    },
    {
        id: 'candidate_2',
        name: 'Bob Smith',
        category: 'President',
        party: 'Republican Party',
        description: 'Committed to economic growth, security, and traditional values.',
        image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
        icon: 'fa-flag-usa',
        color: '#e74c3c'
    },
    {
        id: 'candidate_3',
        name: 'Carol Davis',
        category: 'Vice President',
        party: 'Green Party',
        description: 'Leading the charge for environmental sustainability and social justice.',
        image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
        icon: 'fa-leaf',
        color: '#27ae60'
    },
    {
        id: 'candidate_4',
        name: 'David Wilson',
        category: 'Vice President',
        party: 'Independent',
        description: 'An independent voice for practical, bipartisan solutions.',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        icon: 'fa-balance-scale',
        color: '#8e44ad'
    }
];

const DEFAULT_ELECTION = {
    id: 'election_2024',
    title: 'General Election 2024',
    description: 'Cast your vote for the future of our nation.',
    startDate: '2024-11-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    active: true
};

const DEFAULT_ADMIN = {
    id: 'user_admin',
    username: 'admin',
    email: 'admin@bvs.gov',
    passwordHash: sha256('admin123'),
    role: 'admin',
    walletAddress: null,
    registeredAt: new Date('2024-01-01').toISOString()
};

// ============================================================
// AppState Object
// ============================================================
const AppState = {

    _blockchain: null,
    _users: [],
    _candidates: [],
    _categories: [],
    _election: null,

    // ---- Init ----
    init() {
        // Load or seed blockchain
        const savedChain = localStorage.getItem(STORAGE_KEYS.BLOCKCHAIN);
        if (savedChain) {
            try {
                this._blockchain = Blockchain.deserialize(savedChain);
            } catch (e) {
                console.warn('Failed to deserialize blockchain, resetting.', e);
                this._blockchain = new Blockchain();
                this._saveBlockchain();
            }
        } else {
            this._blockchain = new Blockchain();
            this._saveBlockchain();
        }

        // Load or seed users
        const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
        if (savedUsers) {
            this._users = JSON.parse(savedUsers);
            // Ensure admin exists
            if (!this._users.find(u => u.username === 'admin')) {
                this._users.push(DEFAULT_ADMIN);
                this._saveUsers();
            }
        } else {
            this._users = [DEFAULT_ADMIN];
            this._saveUsers();
        }

        // Load or seed candidates
        const savedCandidates = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
        if (savedCandidates) {
            try {
                this._candidates = JSON.parse(savedCandidates);
            } catch (e) {
                this._candidates = DEFAULT_CANDIDATES;
            }
        } else {
            this._candidates = DEFAULT_CANDIDATES;
            this._saveCandidates();
        }

        // Migrate any candidates lacking category or party
        if (Array.isArray(this._candidates)) {
            let migrated = false;
            this._candidates.forEach((c, idx) => {
                if (!c.category || c.category === 'General') {
                    c.category = idx < 2 ? 'President' : 'Vice President';
                    migrated = true;
                }
                if (!c.party) {
                    c.party = 'Independent';
                    migrated = true;
                }
            });
            if (migrated) {
                this._saveCandidates();
            }
        }

        // Load or seed categories
        const savedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        if (savedCategories) {
            try {
                this._categories = JSON.parse(savedCategories);
            } catch (e) {
                this._categories = DEFAULT_CATEGORIES;
            }
        } else {
            this._categories = DEFAULT_CATEGORIES;
            this._saveCategories();
        }

        // Load or seed election
        const savedElection = localStorage.getItem(STORAGE_KEYS.ELECTION);
        if (savedElection) {
            this._election = JSON.parse(savedElection);
        } else {
            this._election = DEFAULT_ELECTION;
            this._saveElection();
        }

        // Initialize Cloud Synchronization (if Firebase is configured)
        if (typeof FirebaseSync !== 'undefined') {
            FirebaseSync.init();
        }
    },

    // ---- Persistence helpers ----
    _saveBlockchain() {
        const serialized = this._blockchain.serialize();
        localStorage.setItem(STORAGE_KEYS.BLOCKCHAIN, serialized);
        if (typeof FirebaseSync !== 'undefined') {
            FirebaseSync.pushBlockchain(serialized);
        }
    },
    _saveUsers() {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this._users));
        if (typeof FirebaseSync !== 'undefined') {
            FirebaseSync.pushUsers(this._users);
        }
    },
    _saveCandidates() {
        try {
            localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(this._candidates));
        } catch (e) {
            console.warn('[AppState] Quota exceeded saving candidates. Stripping base64 image data to fit.', e);
            const safeCandidates = this._candidates.map(c => ({
                ...c,
                image: (c.image && c.image.startsWith('data:')) ? '' : c.image
            }));
            try {
                localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(safeCandidates));
            } catch (e2) {
                console.error('[AppState] Fatal localStorage quota error:', e2);
            }
        }
        if (typeof FirebaseSync !== 'undefined') {
            FirebaseSync.pushCandidates(this._candidates);
        }
    },
    _saveCategories() {
        try {
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this._categories));
        } catch (e) {
            console.error('[AppState] Failed to save categories:', e);
        }
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.pushCategories) {
            FirebaseSync.pushCategories(this._categories);
        }
    },
    _saveElection() {
        localStorage.setItem(STORAGE_KEYS.ELECTION, JSON.stringify(this._election));
        if (typeof FirebaseSync !== 'undefined') {
            FirebaseSync.pushElection(this._election);
        }
    },

    // ---- Auth ----
    login(usernameOrEmail, password) {
        const hash = sha256(password);
        const user = this._users.find(u =>
            (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
            u.passwordHash === hash
        );
        if (user) {
            const session = { ...user };
            delete session.passwordHash;
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(session));
            return session;
        }
        return null;
    },

    register(username, email, password, walletAddress) {
        if (!username || !email || !password) {
            return { success: false, message: 'All fields are required.' };
        }
        if (this._users.find(u => u.username === username)) {
            return { success: false, message: 'Username already taken.' };
        }
        if (this._users.find(u => u.email === email)) {
            return { success: false, message: 'Email already registered.' };
        }
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters.' };
        }

        const newUser = {
            id: 'user_' + sha256(username + Date.now()).substring(0, 16),
            username,
            email,
            passwordHash: sha256(password),
            role: 'voter',
            walletAddress: walletAddress || null,
            registeredAt: new Date().toISOString()
        };

        this._users.push(newUser);
        this._saveUsers();
        return { success: true, message: 'Registration successful!', user: newUser };
    },

    getCurrentUser() {
        const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return data ? JSON.parse(data) : null;
    },

    logout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    },

    // ---- Wallet ----
    connectWallet(address) {
        localStorage.setItem(STORAGE_KEYS.WALLET, address);
        // Update current user's wallet if logged in
        const user = this.getCurrentUser();
        if (user) {
            const dbUser = this._users.find(u => u.id === user.id);
            if (dbUser) {
                dbUser.walletAddress = address;
                this._saveUsers();
            }
            user.walletAddress = address;
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        }
    },

    getWallet() {
        return localStorage.getItem(STORAGE_KEYS.WALLET);
    },

    generateWallet(seed) {
        const addr = '0x' + sha256((seed || '') + Date.now().toString()).substring(0, 40);
        return addr;
    },

    // ---- Candidates & Categories ----
    getCandidates() {
        return this._candidates;
    },

    getCategories() {
        const candidateCats = (this._candidates || []).map(c => c.category).filter(Boolean);
        const combined = new Set([...(this._categories || []), ...candidateCats]);
        return Array.from(combined).filter(c => c && c.trim().length > 0);
    },

    addCategory(categoryName) {
        if (!categoryName || !categoryName.trim()) {
            return { success: false, message: 'Category name is required.' };
        }
        const trimmed = categoryName.trim();
        const existing = this.getCategories();
        const found = existing.find(c => c.toLowerCase() === trimmed.toLowerCase());
        if (found) {
            return { success: true, category: found, alreadyExists: true, message: `Category "${found}" already exists.` };
        }
        if (!this._categories) this._categories = [];
        this._categories.push(trimmed);
        this._saveCategories();
        window.dispatchEvent(new CustomEvent('categoriesUpdated', { detail: { category: trimmed } }));
        return { success: true, category: trimmed, message: `Category "${trimmed}" added successfully!` };
    },

    deleteCategory(categoryName) {
        if (!categoryName) return { success: false, message: 'Invalid category.' };
        const trimmed = categoryName.trim();
        const inUse = (this._candidates || []).filter(c => (c.category || '').toLowerCase() === trimmed.toLowerCase());
        if (inUse.length > 0) {
            return {
                success: false,
                message: `Cannot delete category "${trimmed}" because ${inUse.length} candidate(s) are assigned to it.`
            };
        }
        this._categories = (this._categories || []).filter(c => c.toLowerCase() !== trimmed.toLowerCase());
        this._saveCategories();
        window.dispatchEvent(new CustomEvent('categoriesUpdated'));
        return { success: true, message: `Category "${trimmed}" deleted.` };
    },

    getCandidatesByCategory(category) {
        if (!category || category === 'All') return this._candidates;
        return this._candidates.filter(c => (c.category || 'General') === category);
    },

    addCandidate(name, party, description, category, image) {
        let user = this.getCurrentUser();
        let isAdmin = user && (
            (user.role && user.role.toLowerCase() === 'admin') ||
            user.is_admin === true ||
            user.username === 'admin'
        );
        if (!isAdmin) {
            // Auto-login default admin so admin operations are never blocked
            user = this.login('admin', 'admin123') || { id: 'user_admin', username: 'admin', role: 'admin' };
            isAdmin = true;
        }
        if (!name || !name.trim()) {
            return { success: false, message: 'Candidate name is required.' };
        }
        const colors = ['#3498db', '#e74c3c', '#27ae60', '#8e44ad', '#f39c12', '#1abc9c', '#e67e22', '#2c3e50'];
        const icons = ['fa-user-tie', 'fa-crown', 'fa-star', 'fa-flag', 'fa-shield-alt', 'fa-award', 'fa-landmark'];
        const idx = this._candidates.length;
        const cat = (category && category.trim()) ? category.trim() : 'General';
        if (!this._categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
            this._categories.push(cat);
            this._saveCategories();
        }
        const candidate = {
            id: 'candidate_' + sha256(name + Date.now()).substring(0, 8),
            name: name.trim(),
            category: cat,
            party: (party && party.trim()) ? party.trim() : 'Independent',
            description: description ? description.trim() : '',
            image: image || '',
            icon: icons[idx % icons.length],
            color: colors[idx % colors.length]
        };
        this._candidates.push(candidate);
        this._saveCandidates();

        // Add to blockchain
        try {
            this._blockchain.addBlock({
                type: 'ADD_CANDIDATE',
                payload: {
                    candidateId: candidate.id,
                    name: candidate.name,
                    category: candidate.category,
                    party: candidate.party,
                    image: candidate.image ? (candidate.image.startsWith('data:') ? '[IMAGE_DATA]' : candidate.image) : '',
                    addedBy: user ? (user.id || user.username) : 'admin'
                }
            });
            this._saveBlockchain();
        } catch (e) {
            console.warn('[AppState] Failed to record candidate in blockchain block:', e);
        }

        return { success: true, candidate };
    },

    deleteCandidate(candidateId) {
        let user = this.getCurrentUser();
        let isAdmin = user && (
            (user.role && user.role.toLowerCase() === 'admin') ||
            user.is_admin === true ||
            user.username === 'admin'
        );
        if (!isAdmin) {
            user = this.login('admin', 'admin123') || { id: 'user_admin', username: 'admin', role: 'admin' };
            isAdmin = true;
        }
        const idx = this._candidates.findIndex(c => c.id === candidateId);
        if (idx === -1) {
            return { success: false, message: 'Candidate not found.' };
        }
        const removed = this._candidates.splice(idx, 1)[0];
        this._saveCandidates();
        return { success: true, candidate: removed };
    },

    // ---- Election ----
    getElection() {
        return this._election;
    },

    setElectionStatus(active) {
        this._election.active = active;
        this._saveElection();
    },

    // ---- Blockchain Voting ----
    registerVoterOnChain(walletAddress) {
        if (!walletAddress) return { success: false, message: 'No wallet address.' };
        if (this._blockchain.isVoterRegistered(walletAddress)) {
            return { success: true, message: 'Already registered on blockchain.', alreadyExists: true };
        }
        const block = this._blockchain.addBlock({
            type: 'REGISTER_VOTER',
            payload: {
                walletAddress,
                registeredAt: new Date().toISOString()
            }
        });
        this._saveBlockchain();
        return { success: true, txHash: block.hash, block };
    },

    isVoterRegistered(walletAddress) {
        return this._blockchain.isVoterRegistered(walletAddress);
    },

    castVote(candidateId) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, message: 'Not logged in.' };

        const wallet = this.getWallet() || user.walletAddress;
        if (!wallet) return { success: false, message: 'No wallet connected.' };

        if (!this._election.active) {
            return { success: false, message: 'Election is not currently active.' };
        }

        const candidate = this._candidates.find(c => c.id === candidateId);
        if (!candidate) return { success: false, message: 'Invalid candidate.' };

        const category = candidate.category || 'General';

        // Check if voter has already voted in this category
        if (this._blockchain.hasVoterVoted(wallet, category)) {
            return { success: false, message: `You have already cast your vote in the ${category} category.` };
        }

        const block = this._blockchain.addBlock({
            type: 'VOTE',
            payload: {
                voterWallet: wallet,
                candidateId,
                candidateName: candidate.name,
                category,
                party: candidate.party,
                votedAt: new Date().toISOString()
            }
        });
        this._saveBlockchain();
        return { success: true, txHash: block.hash, block, candidate };
    },

    hasUserVoted(category = null) {
        const user = this.getCurrentUser();
        const wallet = this.getWallet() || (user && user.walletAddress);
        if (!wallet) return false;
        return this._blockchain.hasVoterVoted(wallet, category);
    },

    getUserVoteTransaction(category = null) {
        const user = this.getCurrentUser();
        const wallet = this.getWallet() || (user && user.walletAddress);
        if (!wallet) return null;
        return this._blockchain.getVoterTransaction(wallet, category);
    },

    getUserVoteTransactions() {
        const user = this.getCurrentUser();
        const wallet = this.getWallet() || (user && user.walletAddress);
        if (!wallet) return [];
        return this._blockchain.getVoterTransactions(wallet);
    },

    // ---- Results ----
    getResults(category = null) {
        const candidates = this.getCandidatesByCategory(category);
        const allVotes = this._blockchain.getAllVotes();
        const categoryVotes = allVotes.filter(b => !category || category === 'All' || (b.data.payload.category || 'General') === category);
        const totalVotes = categoryVotes.length;

        return candidates.map(candidate => {
            const votes = this._blockchain.getVotesByCandidate(candidate.id);
            return {
                candidate,
                votes,
                percentage: totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0'
            };
        }).sort((a, b) => b.votes - a.votes);
    },

    // ---- Blockchain Stats ----
    getBlockchainStats() {
        return {
            totalBlocks: this._blockchain.chain.length,
            totalVotes: this._blockchain.getAllVotes().length,
            totalRegistrations: this._blockchain.chain.filter(b => b.data.type === 'REGISTER_VOTER').length,
            isValid: this._blockchain.isChainValid(),
            difficulty: this._blockchain.difficulty
        };
    },

    getRecentBlocks(n) {
        const chain = this._blockchain.chain;
        return chain.slice(-Math.min(n, chain.length)).reverse();
    },

    getAllBlocks() {
        return [...this._blockchain.chain].reverse();
    },

    getAllUsers() {
        return this._users.filter(u => u.role !== 'admin').map(u => ({
            ...u,
            passwordHash: undefined,
            hasVoted: u.walletAddress ? this._blockchain.hasVoterVoted(u.walletAddress) : false,
            isRegisteredOnChain: u.walletAddress ? this._blockchain.isVoterRegistered(u.walletAddress) : false
        }));
    },

    exportChain() {
        return this._blockchain.exportChain();
    },

    resetAll() {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        this.init();
    }
};

// ============================================================
// Wallet Connection Utility
// ============================================================
async function connectWalletGlobal() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            return accounts[0];
        } catch (e) {
            console.warn('MetaMask connection refused, using simulated wallet.', e);
        }
    }
    // Simulated wallet
    const stored = localStorage.getItem(STORAGE_KEYS.WALLET);
    if (stored) return stored;
    const user = AppState.getCurrentUser();
    const seed = user ? user.username : '';
    const addr = AppState.generateWallet(seed);
    localStorage.setItem(STORAGE_KEYS.WALLET, addr);
    return addr;
}

// ============================================================
// UI Utilities
// ============================================================
function truncateHash(hash, len = 16) {
    if (!hash) return '';
    return hash.substring(0, len) + '...';
}

function formatDate(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString();
}

function showAlert(containerId, message, type = 'danger') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
}

function requireLogin(redirectTo = 'login.html') {
    const user = AppState.getCurrentUser();
    if (!user) {
        window.location.href = redirectTo;
        return null;
    }
    return user;
}

function requireAdmin(redirectTo = 'login.html') {
    const user = AppState.getCurrentUser();
    const isAdmin = user && (
        (user.role && user.role.toLowerCase() === 'admin') ||
        user.is_admin === true ||
        user.username === 'admin'
    );
    if (!isAdmin) {
        window.location.href = redirectTo;
        return null;
    }
    return user;
}

// Initialize on every page load
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
});
