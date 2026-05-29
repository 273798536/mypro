from settlement.models import Contract, Show, Sponsorship


class ContractParser:
    def __init__(
        self,
        contracts: list[Contract],
        shows: list[Show],
        sponsorships: list[Sponsorship],
    ):
        self.contracts = {c.contract_id: c for c in contracts}
        self.shows = shows
        self.sponsorships = sponsorships
        self._show_by_contract: dict[str, list[Show]] = {}
        self._sponsor_by_contract: dict[str, list[Sponsorship]] = {}
        self._sponsor_by_show: dict[str, list[Sponsorship]] = {}
        self._build_indexes()

    def _build_indexes(self):
        for s in self.shows:
            self._show_by_contract.setdefault(s.contract_id, []).append(s)
        for sp in self.sponsorships:
            self._sponsor_by_contract.setdefault(sp.contract_id, []).append(sp)
            if sp.show_id:
                self._sponsor_by_show.setdefault(sp.show_id, []).append(sp)

    def get_contract(self, contract_id: str):
        return self.contracts.get(contract_id)

    def get_shows(self, contract_id: str) -> list[Show]:
        return self._show_by_contract.get(contract_id, [])

    def get_sponsorships_for_contract(self, contract_id: str) -> list[Sponsorship]:
        return sorted(
            self._sponsor_by_contract.get(contract_id, []),
            key=lambda s: s.deduction_order,
        )

    def get_sponsorships_for_show(self, show_id: str) -> list[Sponsorship]:
        return sorted(
            self._sponsor_by_show.get(show_id, []),
            key=lambda s: s.deduction_order,
        )

    def parse_guarantee(self, contract_id: str) -> dict:
        c = self.get_contract(contract_id)
        if c is None:
            return {"error": f"Contract {contract_id} not found"}
        return {
            "contract_id": contract_id,
            "artist_name": c.artist_name,
            "guarantee_amount": c.guarantee_amount,
            "artist_split_ratio": c.artist_split_ratio,
            "sponsor_deduction_order": c.sponsor_deduction_order,
            "refund_cross_show": c.refund_cross_show,
        }

    def parse_split_terms(self, contract_id: str) -> dict:
        c = self.get_contract(contract_id)
        if c is None:
            return {"error": f"Contract {contract_id} not found"}
        return {
            "contract_id": contract_id,
            "artist_split_ratio": c.artist_split_ratio,
            "promoter_split_ratio": round(1.0 - c.artist_split_ratio, 6),
            "sponsor_deduction_order": c.sponsor_deduction_order,
            "deduction_order_description": (
                "赞助从票房中先扣除再分成"
                if c.sponsor_deduction_order == "before_split"
                else "分成后从艺人份额中扣除赞助"
            ),
        }

    def parse_sponsor_rules(self, contract_id: str) -> list[dict]:
        sp_list = self.get_sponsorships_for_contract(contract_id)
        result = []
        for sp in sp_list:
            result.append(
                {
                    "sponsorship_id": sp.sponsorship_id,
                    "sponsor_name": sp.sponsor_name,
                    "amount": sp.effective_amount,
                    "show_id": sp.show_id,
                    "deduction_order": sp.deduction_order,
                    "scope": "场次级" if sp.show_id else "巡演级",
                    "notes": sp.notes,
                }
            )
        return result

    def summary(self, contract_id: str) -> dict:
        guarantee = self.parse_guarantee(contract_id)
        split = self.parse_split_terms(contract_id)
        sponsors = self.parse_sponsor_rules(contract_id)
        shows = self.get_shows(contract_id)
        show_summaries = []
        for s in shows:
            show_sponsors = self.get_sponsorships_for_show(s.show_id)
            show_summaries.append(
                {
                    "show_id": s.show_id,
                    "city": s.city,
                    "date": s.show_date,
                    "gross_box_office": s.gross_box_office,
                    "refunds": s.refunds,
                    "net_box_office": s.net_box_office,
                    "show_level_sponsors": len(show_sponsors),
                    "notes": s.notes,
                }
            )
        return {
            "guarantee": guarantee,
            "split_terms": split,
            "sponsor_rules": sponsors,
            "shows": show_summaries,
        }
