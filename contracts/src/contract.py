# Import required ARC4 components from algopy
from algopy import ARC4Contract, Txn, Global, arc4
from algopy import String, UInt64


class PlacementVerify(ARC4Contract):

    # =====================================================
    # CONTRACT INITIALIZATION (GLOBAL STATE VARIABLES)
    # =====================================================
    def __init__(self) -> None:
        # Store the admin (college) address.
        # The creator of the app becomes the admin.
        self.admin = Global.creator_address

        # Auto-increment counter for claims.
        # Every new claim gets a unique ID.
        self.next_claim_id = UInt64(1)

        # Store all claims in one serialized string.
        # Each claim will be appended here.
        self.claims_data = String("")


    # =====================================================
    # ISSUE CLAIM (ONLY ADMIN CAN CALL)
    # =====================================================
    @arc4.abimethod
    def issue_claim(
        self,
        student: String,
        claim_type: String,
        claim_value: String,
        issuer: String,
        issue_date: String
    ) -> UInt64:

        # 🔐 Permission Check:
        # Only the admin (college) can issue claims.
        assert Txn.sender == self.admin

        # Get current claim ID
        claim_id = self.next_claim_id

        # Build serialized claim string
        # Format:
        # student|type|value|issuer|date|ACTIVE|TRUE#
        new_claim = (
            student
            + String("|")
            + claim_type
            + String("|")
            + claim_value
            + String("|")
            + issuer
            + String("|")
            + issue_date
            + String("|ACTIVE|TRUE#")
        )

        # Append new claim to global claims storage
        self.claims_data = self.claims_data + new_claim

        # Increment claim ID counter
        self.next_claim_id = claim_id + UInt64(1)

        # Return claim ID to frontend
        return claim_id


    # =====================================================
    # REVOKE CLAIM (ONLY ADMIN CAN CALL)
    # =====================================================
    @arc4.abimethod
    def revoke_claim(
        self,
        claim_id: UInt64
    ) -> None:

        # 🔐 Only admin can revoke claims
        assert Txn.sender == self.admin

        # For MVP simplicity:
        # Instead of editing old data (complex in ARC4),
        # we append a revoke log entry.
        self.claims_data = self.claims_data + String("REVOKED#")


    # =====================================================
    # GET ALL CLAIMS (READ-ONLY)
    # =====================================================
    @arc4.abimethod(readonly=True)
    def get_all_claims(self) -> String:

        # Anyone can read all stored claims.
        # This is used by recruiter view.
        return self.claims_data


    # =====================================================
    # GET NEXT CLAIM ID (READ-ONLY)
    # =====================================================
    @arc4.abimethod(readonly=True)
    def get_next_claim_id(self) -> UInt64:

        # Returns the next claim ID counter.
        # Useful for frontend to know total number of claims.
        return self.next_claim_id
