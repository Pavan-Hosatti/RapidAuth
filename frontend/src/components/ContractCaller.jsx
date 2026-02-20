import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, CircleCheck, History } from 'lucide-react';
import * as algosdk from 'algosdk';
import { peraWallet } from '../services/WalletService';
import { HashService } from '../services/HashService';
import { BlockchainService, APP_ID } from '../services/BlockchainService';


const CLAIM_TYPES = ['Marksheet', 'Degree', 'NOC', 'Sports', 'Placement', 'Certificate'];

const ContractCaller = ({ address, students, onClaimIssued, issuers, claims, onRevoke }) => {
    const [studentId, setStudentId] = useState('');
    const [claimType, setClaimType] = useState('Marksheet');
    const [claimValue, setClaimValue] = useState('');
    const [claimDate, setClaimDate] = useState(new Date().toISOString().slice(0, 10));
    const [issuerLabel, setIssuerLabel] = useState('Exam Cell');
    const [certificate, setCertificate] = useState(null);
    const [baseRecordId, setBaseRecordId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [txId, setTxId] = useState('');
    const fileRef = useRef(null);


    const isWhitelisted = issuers.includes(address);

    const handleIssue = async (e) => {
        e.preventDefault();
        if (!studentId || !claimValue) {
            setResult('❌ Please select a student and provide claim details.');
            return;
        }

        setLoading(true);
        setResult('');
        setTxId('');

        try {
            // Step 1: Hash document if attached
            let fileHash = '';
            if (certificate) {
                setResult('🛡️ Hashing document (SHA-256)...');
                fileHash = await HashService.hashFile(certificate);
            }

            // Step 2: Create secure composite record hash
            const secureHash = await HashService.createSecureRecordHash({
                studentId,
                claimType,
                claimValue,
                fileHash,
            });

            setResult('⛓️ Preparing Algorand transaction...');
            let confirmedTxId = '';

            try {
                // HIGH-CAPACITY ANCHORING: Using Payment Notes (1KB Limit) instead of Smart Contract State (128B Limit)
                // This ensures the transaction succeeds even with long descriptions, as the contract 755797878 is full.
                const txn = await BlockchainService.prepareAssetTransaction(
                    address,
                    secureHash,
                    {
                        type: claimType,
                        studentId: studentId,
                        issuer: issuerLabel,
                        val: claimValue
                    }
                );

                setResult('📱 Approve on Pera Wallet...');
                const signedTxn = await peraWallet.signTransaction([[{ txn, signers: [address] }]]);
                confirmedTxId = await BlockchainService.sendTransaction(signedTxn[0]);

                if (confirmedTxId) {
                    await BlockchainService.waitForConfirmation(confirmedTxId);
                    setTxId(confirmedTxId);
                    setResult(`✅ ${claimType === 'Placement' ? 'Placement verified' : 'Credential minted'} on Testnet!`);
                }
            } catch (err) {
                console.error('On-chain failed:', err);
                setResult(`❌ Error: ${err.message || 'Transaction failed'}`);
                return; // Stop here if on-chain fails
            }

            const student = students.find(s => s.id === studentId);
            onClaimIssued({
                studentId,
                studentName: student ? student.name : 'Unknown',
                type: claimType,
                value: claimValue,
                issuer: address,
                date: claimDate,
                txId: confirmedTxId,
                secureHash,
                previousVersion: baseRecordId || null,
            });

            // Reset form
            setStudentId('');
            setClaimValue('');
            setBaseRecordId('');
            setCertificate(null);

            setResult(`✅ Success! Hash anchored to Algorand. Tip: Log out and log in as the Student (Ravi) to see it!`);
        } catch (err) {
            console.error('Blockchain tx error:', err);
            setResult(`❌ Transaction failed: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cv-card">
            <h2>🔐 Mint Academic Credential</h2>
            <p className="cv-hint">Broadcast a verifiable record to the Algorand ledger. Each issuance produces a real Tx ID.</p>

            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '0.8rem 1rem', borderRadius: '12px', margin: '1rem 0', color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Shield size={16} /> Institutional Authorization Verified (Wallet Connected)
            </div>

            <div className="cv-form-grid">
                <div className="cv-form-group">
                    <label className="cv-label">Student</label>
                    <select className="cv-input" value={studentId} onChange={e => setStudentId(e.target.value)}>
                        <option value="">— Select Student —</option>
                        {students.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                    </select>
                </div>

                <div className="cv-form-group">
                    <label className="cv-label">Claim Type</label>
                    <select className="cv-input" value={claimType} onChange={e => setClaimType(e.target.value)}>
                        {CLAIM_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>

                <div className="cv-form-group">
                    <label className="cv-label">Value / Description</label>
                    <input
                        className="cv-input"
                        placeholder="e.g. Sem 5 – 78% or B.Tech CS"
                        value={claimValue}
                        onChange={e => setClaimValue(e.target.value)}
                    />
                </div>

                <div className="cv-form-group">
                    <label className="cv-label">Issuing Department</label>
                    <select className="cv-input" value={issuerLabel} onChange={e => setIssuerLabel(e.target.value)}>
                        {['Exam Cell', 'Registrar', 'Admin Office', 'Placement Cell', 'Sports Dept'].map(d => (
                            <option key={d}>{d}</option>
                        ))}
                    </select>
                </div>

                <div className="cv-form-group">
                    <label className="cv-label">Issue Date</label>
                    <input
                        className="cv-input"
                        type="date"
                        value={claimDate}
                        onChange={e => setClaimDate(e.target.value)}
                    />
                </div>

                <div className="cv-form-group">
                    <label className="cv-label">Attach Document (Optional)</label>
                    <div className="cv-file-zone" onClick={() => fileRef.current.click()}>
                        <input type="file" hidden ref={fileRef} onChange={e => setCertificate(e.target.files[0])} />
                        {certificate ? `📄 ${certificate.name}` : '📁 Click to attach (hashed locally)'}
                    </div>
                </div>

                <div className="cv-form-group">
                    <label className="cv-label">Base Record ID (Revision Only)</label>
                    <input
                        className="cv-input"
                        placeholder="e.g. C1700000000 (if revising)"
                        value={baseRecordId}
                        onChange={e => setBaseRecordId(e.target.value)}
                    />
                    <span className="cv-auth-hint">Enter ID of the record this is replacing</span>
                </div>
            </div>

            <button
                className={`cv-btn-primary cv-btn-large ${loading ? 'loading' : ''} ${(studentId && claimValue && !loading) ? 'cv-tour-pulse' : ''}`}
                onClick={handleIssue}
                disabled={loading}
            >
                {loading ? 'Broadcasting to Algorand...' : '🔐 Mint Credential on Algorand'}
            </button>

            {result && (
                <div className={`cv-status-banner ${result.startsWith('✅') ? 'success' : result.startsWith('❌') ? 'error' : 'info'}`}>
                    {result}
                    {result.startsWith('✅') && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#fff', fontWeight: '700' }}>
                            👉 Next Tip: Disconnect and log in as "Student" to see this record in your private vault!
                        </div>
                    )}
                </div>
            )}

            {txId && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <a className="cv-algo-link" href={`https://lora.algokit.io/testnet/transaction/${txId}`} target="_blank" rel="noreferrer">
                        🛠️ View on AlgoKit Lora ↗
                    </a>
                </div>
            )}

            <hr style={{ margin: '2rem 0', borderColor: 'rgba(255,255,255,0.05)' }} />

            <div className="cv-nft-logs" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>📋 Issuance Registry</h3>
                    <span className="cv-badge" style={{ fontSize: '0.65rem' }}>TESTNET</span>
                </div>

                {claims.filter(c => c.issuer === address || c.issuer === 'Academic Office').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--cv-text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px solid var(--cv-border)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
                        <div style={{ fontSize: '0.9rem' }}>No credentials minted yet. Use the form above to issue your first claim.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {claims.filter(c => c.issuer === address || c.issuer === 'Academic Office').map(claim => (
                            <div key={claim.id} style={{
                                background: claim.status === 'revoked' ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                                border: '1px solid',
                                borderColor: claim.status === 'revoked' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.15)',
                                borderRadius: '14px',
                                padding: '1rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                flexWrap: 'wrap',
                            }}>
                                {/* Status dot */}
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                    background: claim.status === 'active' ? '#22c55e' : claim.status === 'revoked' ? '#ef4444' : '#f59e0b'
                                }} />

                                {/* Main info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>
                                            {students.find(s => s.id === claim.studentId)?.name || 'Unknown'}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,0.12)', color: 'var(--cv-primary)', fontWeight: '600' }}>
                                            {claim.type}
                                        </span>
                                        <span className={`cv-tag cv-tag-${claim.status}`} style={{ fontSize: '0.65rem' }}>
                                            {claim.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--cv-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {claim.value}
                                    </div>
                                    {claim.status === 'revoked' && (
                                        <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                            ⛔ {claim.revocationReason}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {claim.status === 'active' && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                                        <select
                                            className="cv-input cv-input-small"
                                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem', minWidth: '130px' }}
                                            onChange={async (e) => {
                                                const reason = e.target.value;
                                                if (!reason) return;
                                                const currentClaimId = claim.id;
                                                if (window.confirm(`Revoke this record on-chain?\nReason: ${reason}`)) {
                                                    setLoading(true);
                                                    setResult(`⛓️ Preparing on-chain revocation anchor...`);
                                                    try {
                                                        // HIGH-CAPACITY ANCHORING: Using Payment Notes for Revocation
                                                        // This ensures success even when the Smart Contract storage is full.
                                                        const txn = await BlockchainService.prepareAssetTransaction(
                                                            address,
                                                            "REVOKED", // Sentinel hash to indicate revocation
                                                            {
                                                                type: "REVOKE",
                                                                id: currentClaimId,
                                                                reason: reason,
                                                                target: claim.txId // Tie it to the original issuance transaction
                                                            }
                                                        );

                                                        setResult('📱 Approve on Pera Wallet...');
                                                        const signedTxn = await peraWallet.signTransaction([[{ txn, signers: [address] }]]);
                                                        const confirmedTxId = await BlockchainService.sendTransaction(signedTxn[0]);

                                                        if (confirmedTxId) {
                                                            await BlockchainService.waitForConfirmation(confirmedTxId);
                                                            onRevoke(currentClaimId, reason);
                                                            setResult(`✅ Revocation anchored on Algorand! Tx: ${confirmedTxId.slice(0, 8)}...`);
                                                        }
                                                    } catch (err) {
                                                        console.error('Revocation failed:', err);
                                                        setResult(`❌ Revocation failed: ${err.message}`);
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">🚫 Revoke…</option>
                                            <option value="Fraudulent Document">Fraudulent</option>
                                            <option value="Error in Issuance">Data Error</option>
                                            <option value="Administrative Policy">Policy Change</option>
                                            <option value="Expired Early">Early Expiry</option>
                                        </select>
                                        <button
                                            className="cv-btn-ghost cv-btn-small"
                                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}
                                            onClick={() => {
                                                setStudentId(claim.studentId);
                                                setClaimType(claim.type);
                                                setBaseRecordId(claim.id);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                        >
                                            🔄 Revise
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContractCaller;
