'use client';

import { useEffect, useState } from 'react';
import {
  DepositModal,
  WithdrawModal,
  DEPOSIT_MODAL_OPEN_EVENT,
  WITHDRAW_MODAL_OPEN_EVENT,
} from '@agg-build/ui';

// AGG exposes requestAggDepositModalOpen() / requestAggWithdrawModalOpen()
// as window-event dispatchers, but ships no mounted listener — every host
// app must mount <DepositModal> and <WithdrawModal> somewhere in the tree
// and wire them to those events. Without this, clicking the Deposit or
// Withdraw buttons in <ConnectButton> / <UserProfilePage> silently no-ops.
//
// Mounted once at the root via <Providers> so every page benefits.
export default function AggModals() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    const onDeposit = () => setDepositOpen(true);
    const onWithdraw = () => setWithdrawOpen(true);
    window.addEventListener(DEPOSIT_MODAL_OPEN_EVENT, onDeposit);
    window.addEventListener(WITHDRAW_MODAL_OPEN_EVENT, onWithdraw);
    return () => {
      window.removeEventListener(DEPOSIT_MODAL_OPEN_EVENT, onDeposit);
      window.removeEventListener(WITHDRAW_MODAL_OPEN_EVENT, onWithdraw);
    };
  }, []);

  return (
    <>
      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </>
  );
}
