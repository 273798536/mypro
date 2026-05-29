from settlement.models import (
    Contract, Show, Sponsorship, Settlement, RefundTransfer
)


class SettlementEngine:
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

    def _get_show_sponsors(self, show_id: str) -> list[Sponsorship]:
        return sorted(
            self._sponsor_by_show.get(show_id, []),
            key=lambda s: s.deduction_order,
        )

    def _get_contract_sponsors(self, contract_id: str) -> list[Sponsorship]:
        return sorted(
            self._sponsor_by_contract.get(contract_id, []),
            key=lambda s: s.deduction_order,
        )

    def _distribute_tour_sponsors(
        self, contract_id: str, shows: list[Show]
    ) -> dict[str, list[Sponsorship]]:
        tour_sponsors = [
            sp
            for sp in self._get_contract_sponsors(contract_id)
            if sp.show_id is None
        ]
        result: dict[str, list[Sponsorship]] = {s.show_id: [] for s in shows}
        if not shows or not tour_sponsors:
            return result
        show_sponsor_map: dict[str, list[Sponsorship]] = {s.show_id: [] for s in shows}
        for s in shows:
            show_sponsor_map[s.show_id] = list(self._get_show_sponsors(s.show_id))
        total_net = sum(s.net_box_office for s in shows)
        for sp in tour_sponsors:
            if total_net > 0:
                for s in shows:
                    share = s.net_box_office / total_net
                    allocated_amount = sp.effective_amount * share
                    if allocated_amount > 0:
                        show_sponsor_map[s.show_id].append(
                            Sponsorship(
                                sponsorship_id=f"{sp.sponsorship_id}_alloc_{s.show_id}",
                                contract_id=sp.contract_id,
                                sponsor_name=f"{sp.sponsor_name}(巡演分摊)",
                                amount=round(allocated_amount, 2),
                                show_id=s.show_id,
                                deduction_order=sp.deduction_order,
                                notes=sp.notes,
                            )
                        )
            else:
                per_show = sp.effective_amount / len(shows)
                for s in shows:
                    show_sponsor_map[s.show_id].append(
                        Sponsorship(
                            sponsorship_id=f"{sp.sponsorship_id}_alloc_{s.show_id}",
                            contract_id=sp.contract_id,
                            sponsor_name=f"{sp.sponsor_name}(巡演均摊)",
                            amount=round(per_show, 2),
                            show_id=s.show_id,
                            deduction_order=sp.deduction_order,
                            notes=sp.notes,
                        )
                    )
        return show_sponsor_map

    def _compute_cross_show_refunds(
        self, contract: Contract, shows: list[Show]
    ) -> tuple[list[RefundTransfer], dict[str, float]]:
        transfer_map: dict[str, float] = {s.show_id: 0.0 for s in shows}
        transfers: list[RefundTransfer] = []
        if not contract.refund_cross_show:
            return transfers, transfer_map
        gross_map = {s.show_id: (s.gross_box_office or 0.0) for s in shows}
        refund_map = {s.show_id: (s.refunds or 0.0) for s in shows}
        net_map = {s.show_id: s.net_box_office for s in shows}
        excess_refund_map = {
            sid: max(refund_map[sid] - gross_map[sid], 0.0) for sid in gross_map
        }
        deficit_shows = [
            (sid, excess) for sid, excess in excess_refund_map.items() if excess > 0
        ]
        surplus_shows = [
            (sid, net_map[sid]) for sid in net_map if net_map[sid] > 0
        ]
        for def_sid, excess_amt in deficit_shows:
            remaining = excess_amt
            for i, (surp_sid, surplus_amt) in enumerate(surplus_shows):
                if remaining <= 0:
                    break
                if surplus_amt <= 0:
                    continue
                transfer_amt = min(remaining, surplus_amt)
                if transfer_amt > 0:
                    transfers.append(
                        RefundTransfer(
                            from_show_id=surp_sid,
                            to_show_id=def_sid,
                            amount=round(transfer_amt, 2),
                            reason=f"退票跨场: {surp_sid} -> {def_sid}",
                        )
                    )
                    transfer_map[surp_sid] -= transfer_amt
                    transfer_map[def_sid] += transfer_amt
                    surplus_shows[i] = (surp_sid, surplus_amt - transfer_amt)
                    remaining -= transfer_amt
        return transfers, transfer_map

    def settle_show(
        self,
        contract: Contract,
        show: Show,
        show_sponsors: list[Sponsorship],
        refund_transfer_net: float = 0.0,
    ) -> Settlement:
        exceptions: list[str] = []
        gross = show.gross_box_office if show.gross_box_office is not None else 0.0
        refunds = show.refunds if show.refunds is not None else 0.0
        net = show.net_box_office

        if show.gross_box_office is None:
            exceptions.append("票房为空，按0处理")
        if show.refunds is None and refunds == 0.0:
            pass

        adjusted_net = net + refund_transfer_net
        if adjusted_net < 0:
            exceptions.append(
                f"调整后净票房为负({adjusted_net:.2f})，已截断为0"
            )
            adjusted_net = 0.0

        total_sponsor = sum(sp.effective_amount for sp in show_sponsors)
        sponsor_details = [
            {
                "sponsorship_id": sp.sponsorship_id,
                "sponsor_name": sp.sponsor_name,
                "amount": sp.effective_amount,
                "deduction_order": sp.deduction_order,
            }
            for sp in show_sponsors
        ]

        if contract.sponsor_deduction_order == "before_split":
            base_for_split = adjusted_net - total_sponsor
            if base_for_split < 0:
                exceptions.append(
                    f"赞助抵扣后基数({base_for_split:.2f})为负，截断为0"
                )
                base_for_split = 0.0
            artist_raw = base_for_split * contract.artist_split_ratio
        else:
            base_for_split = adjusted_net
            artist_raw = base_for_split * contract.artist_split_ratio - total_sponsor

        guarantee_triggered = artist_raw < contract.guarantee_amount
        if guarantee_triggered:
            exceptions.append(
                f"保底触发: 艺人分成{artist_raw:.2f} < 保底{contract.guarantee_amount:.2f}"
            )

        final_artist = max(artist_raw, contract.guarantee_amount)
        promoter = adjusted_net - total_sponsor - final_artist
        if promoter < 0:
            exceptions.append(
                f"主办方份额为负({promoter:.2f})，保底补差后主办倒贴"
            )

        settlement = Settlement(
            contract_id=contract.contract_id,
            show_id=show.show_id,
            city=show.city,
            show_date=show.show_date,
            gross_box_office=gross,
            total_refunds=refunds,
            net_box_office=net,
            sponsor_deduction=total_sponsor,
            base_for_split=base_for_split,
            artist_raw_share=round(artist_raw, 2),
            guarantee_amount=contract.guarantee_amount,
            is_guarantee_triggered=guarantee_triggered,
            final_artist_payment=round(final_artist, 2),
            promoter_share=round(promoter, 2),
            refund_transfers_in=max(refund_transfer_net, 0.0),
            refund_transfers_out=max(-refund_transfer_net, 0.0),
            exception_notes=exceptions,
            sponsor_details=sponsor_details,
        )
        return settlement

    def settle_contract(self, contract_id: str) -> list[Settlement]:
        contract = self.contracts.get(contract_id)
        if contract is None:
            raise ValueError(f"Contract {contract_id} not found")
        shows = self._show_by_contract.get(contract_id, [])
        if not shows:
            return []

        sponsor_map = self._distribute_tour_sponsors(contract_id, shows)
        transfers, transfer_map = self._compute_cross_show_refunds(contract, shows)

        settlements = []
        for show in shows:
            show_sponsors = sponsor_map.get(show.show_id, [])
            refund_net = transfer_map.get(show.show_id, 0.0)
            settlement = self.settle_show(contract, show, show_sponsors, refund_net)
            settlements.append(settlement)

        return settlements

    def settle_all(self) -> list[Settlement]:
        all_settlements = []
        for contract_id in self.contracts:
            all_settlements.extend(self.settle_contract(contract_id))
        return all_settlements

    def get_refund_transfers(self, contract_id: str) -> list[RefundTransfer]:
        contract = self.contracts.get(contract_id)
        if contract is None:
            return []
        shows = self._show_by_contract.get(contract_id, [])
        transfers, _ = self._compute_cross_show_refunds(contract, shows)
        return transfers

    def explain_exceptions(self, settlements: list[Settlement]) -> list[dict]:
        results = []
        for s in settlements:
            if s.exception_notes:
                results.append(
                    {
                        "settlement_id": s.settlement_id,
                        "contract_id": s.contract_id,
                        "show_id": s.show_id,
                        "city": s.city,
                        "show_date": s.show_date,
                        "exceptions": s.exception_notes,
                        "final_artist_payment": s.final_artist_payment,
                        "is_guarantee_triggered": s.is_guarantee_triggered,
                    }
                )
        return results
