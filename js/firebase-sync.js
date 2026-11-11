// ============================================================
// Firebase Realtime Global Synchronization Engine
// ============================================================

const FirebaseSync = {
    db: null,
    isInitialized: false,
    _syncingFromCloud: false,

    getConfig() {
        try {
            const saved = localStorage.getItem('bvs_firebase_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && (parsed.databaseURL || parsed.projectId)) return parsed;
            }
        } catch (e) {
            console.warn('[FirebaseSync] Error reading saved config:', e);
        }
        if (window.FIREBASE_CONFIG && (window.FIREBASE_CONFIG.databaseURL || window.FIREBASE_CONFIG.projectId)) {
            return window.FIREBASE_CONFIG;
        }
        return null;
    },

    saveConfig(cfg) {
        if (!cfg) {
            localStorage.removeItem('bvs_firebase_config');
        } else {
            localStorage.setItem('bvs_firebase_config', JSON.stringify(cfg));
        }
    },

    init() {
        const config = this.getConfig();
        if (!config || (!config.databaseURL && !config.projectId)) {
            console.log('[FirebaseSync] Operating in Browser Local Storage Mode');
            this._updateUIBadge(false);
            return false;
        }

        try {
            if (typeof firebase === 'undefined') {
                console.warn('[FirebaseSync] Firebase SDK not loaded');
                this._updateUIBadge(false);
                return false;
            }

            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(config);
            }
            this.db = firebase.database();
            this.isInitialized = true;
            console.log('[FirebaseSync] ✓ Successfully connected to Firebase Realtime Database!');
            this._updateUIBadge(true);
            this._listenToCloud();
            return true;
        } catch (err) {
            console.error('[FirebaseSync] Failed to initialize Firebase:', err);
            this._updateUIBadge(false, err.message);
            return false;
        }
    },

    _listenToCloud() {
        if (!this.db) return;

        // 1. Blockchain Realtime Listener
        this.db.ref('blockchain').on('value', snapshot => {
            const cloudChainJson = snapshot.val();
            if (cloudChainJson) {
                try {
                    const cloudChain = Blockchain.deserialize(cloudChainJson);
                    if (cloudChain && cloudChain.isChainValid()) {
                        const localLength = AppState._blockchain ? AppState._blockchain.chain.length : 0;
                        if (cloudChain.chain.length >= localLength) {
                            this._syncingFromCloud = true;
                            AppState._blockchain = cloudChain;
                            localStorage.setItem(STORAGE_KEYS.BLOCKCHAIN, cloudChainJson);
                            this._syncingFromCloud = false;
                            window.dispatchEvent(new CustomEvent('blockchainUpdated', { detail: { source: 'cloud' } }));
                        }
                    }
                } catch (e) {
                    console.warn('[FirebaseSync] Error parsing cloud blockchain:', e);
                }
            } else {
                // If cloud is empty, seed it with our local chain
                if (AppState._blockchain) {
                    this.db.ref('blockchain').set(AppState._blockchain.serialize());
                }
            }
        });

        // 2. Users Realtime Listener
        this.db.ref('users').on('value', snapshot => {
            const cloudUsers = snapshot.val();
            if (cloudUsers && Array.isArray(cloudUsers)) {
                this._syncingFromCloud = true;
                AppState._users = cloudUsers;
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cloudUsers));
                this._syncingFromCloud = false;
                window.dispatchEvent(new CustomEvent('usersUpdated', { detail: { source: 'cloud' } }));
            } else if (AppState._users && AppState._users.length) {
                this.db.ref('users').set(AppState._users);
            }
        });

        // 3. Candidates Realtime Listener
        this.db.ref('candidates').on('value', snapshot => {
            const cloudCandidates = snapshot.val();
            if (cloudCandidates && Array.isArray(cloudCandidates)) {
                this._syncingFromCloud = true;
                AppState._candidates = cloudCandidates;
                localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(cloudCandidates));
                this._syncingFromCloud = false;
                window.dispatchEvent(new CustomEvent('candidatesUpdated', { detail: { source: 'cloud' } }));
            } else if (AppState._candidates && AppState._candidates.length) {
                this.db.ref('candidates').set(AppState._candidates);
            }
        });

        // 4. Election Realtime Listener
        this.db.ref('election').on('value', snapshot => {
            const cloudElection = snapshot.val();
            if (cloudElection) {
                this._syncingFromCloud = true;
                AppState._election = cloudElection;
                localStorage.setItem(STORAGE_KEYS.ELECTION, JSON.stringify(cloudElection));
                this._syncingFromCloud = false;
                window.dispatchEvent(new CustomEvent('electionUpdated', { detail: { source: 'cloud' } }));
            } else if (AppState._election) {
                this.db.ref('election').set(AppState._election);
            }
        });

        // 5. Categories Realtime Listener
        this.db.ref('categories').on('value', snapshot => {
            const cloudCategories = snapshot.val();
            if (cloudCategories && Array.isArray(cloudCategories)) {
                this._syncingFromCloud = true;
                AppState._categories = cloudCategories;
                localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cloudCategories));
                this._syncingFromCloud = false;
                window.dispatchEvent(new CustomEvent('categoriesUpdated', { detail: { source: 'cloud' } }));
            } else if (AppState._categories && AppState._categories.length) {
                this.db.ref('categories').set(AppState._categories);
            }
        });
    },

    pushCategories(categories) {
        if (!this.isInitialized || this._syncingFromCloud || !this.db) return;
        this.db.ref('categories').set(categories).catch(err => {
            console.warn('[FirebaseSync] Failed to push categories to cloud:', err);
        });
    },

    pushBlockchain(chainJson) {
        if (!this.isInitialized || this._syncingFromCloud || !this.db) return;
        this.db.ref('blockchain').set(chainJson).catch(err => {
            console.warn('[FirebaseSync] Failed to push blockchain to cloud:', err);
        });
    },

    pushUsers(users) {
        if (!this.isInitialized || this._syncingFromCloud || !this.db) return;
        this.db.ref('users').set(users).catch(err => {
            console.warn('[FirebaseSync] Failed to push users to cloud:', err);
        });
    },

    pushCandidates(candidates) {
        if (!this.isInitialized || this._syncingFromCloud || !this.db) return;
        this.db.ref('candidates').set(candidates).catch(err => {
            console.warn('[FirebaseSync] Failed to push candidates to cloud:', err);
        });
    },

    pushElection(election) {
        if (!this.isInitialized || this._syncingFromCloud || !this.db) return;
        this.db.ref('election').set(election).catch(err => {
            console.warn('[FirebaseSync] Failed to push election to cloud:', err);
        });
    },

    _updateUIBadge(connected, err) {
        const badges = document.querySelectorAll('.cloud-sync-badge');
        badges.forEach(badge => {
            if (connected) {
                badge.className = 'badge bg-success d-inline-flex align-items-center gap-1 cloud-sync-badge';
                badge.innerHTML = '<i class="fas fa-wifi"></i> Global Cloud Sync';
                badge.title = 'Connected to Firebase. All voters worldwide share this ledger.';
            } else {
                badge.className = 'badge bg-secondary d-inline-flex align-items-center gap-1 cloud-sync-badge';
                badge.innerHTML = '<i class="fas fa-hdd"></i> Local Storage Mode';
                badge.title = err ? 'Firebase error: ' + err : 'Data stored locally in this browser. Connect Firebase to sync across all devices.';
            }
        });
    }
};

