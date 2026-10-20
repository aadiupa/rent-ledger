// ============================================================
// RentLedger — Shared UI Components: CurrencyRow, Badge, Confirm
// ============================================================

// ---------- CurrencyRow ----------------------------------------
// A labeled row showing an amount aligned right.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

interface CurrencyRowProps {
  label: string;
  amount: number;
  color?: string;
  bold?: boolean;
  showSign?: boolean;
  onPress?: () => void;
}

export function CurrencyRow({ label, amount, color, bold, showSign, onPress }: CurrencyRowProps) {
  const amountColor = color ?? (amount >= 0 ? Colors.textPrimary : Colors.danger);
  const sign = showSign ? (amount >= 0 ? '+' : '') : '';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.rowAmount, { color: amountColor }, bold && { fontWeight: '700' }]}>
        {sign}{formatCurrency(Math.abs(amount))}
      </Text>
    </TouchableOpacity>
  );
}

// ---------- StatusBadge ----------------------------------------

interface StatusBadgeProps {
  status: string;
  small?: boolean;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  overdue:        { color: '#fff', bg: Colors.overdue,       label: 'Overdue' },
  partially_paid: { color: '#fff', bg: Colors.partiallyPaid, label: 'Partial' },
  paid:           { color: '#fff', bg: Colors.paid,          label: 'Paid' },
  due:            { color: '#fff', bg: Colors.due,           label: 'Due' },
  upcoming:       { color: Colors.textSecondary, bg: Colors.borderLight, label: 'Upcoming' },
  waived:         { color: '#fff', bg: Colors.textTertiary,  label: 'Waived' },
  active:         { color: '#fff', bg: Colors.success,       label: 'Active' },
  inactive:       { color: '#fff', bg: Colors.textTertiary,  label: 'Inactive' },
  income:         { color: '#fff', bg: Colors.income,        label: 'Income' },
  expense:        { color: '#fff', bg: Colors.expense,       label: 'Expense' },
};

export function StatusBadge({ status, small }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? { color: Colors.textSecondary, bg: Colors.borderLight, label: status };
  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.bg }, small && badgeStyles.small]}>
      <Text style={[badgeStyles.label, { color: cfg.color }, small && badgeStyles.smallText]}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ---------- ConfirmDialog --------------------------------------

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', destructive, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={dialogStyles.overlay} onPress={onCancel}>
        <View style={dialogStyles.card}>
          <Text style={dialogStyles.title}>{title}</Text>
          <Text style={dialogStyles.message}>{message}</Text>
          <View style={dialogStyles.buttons}>
            <TouchableOpacity style={dialogStyles.cancelBtn} onPress={onCancel}>
              <Text style={dialogStyles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dialogStyles.confirmBtn, destructive && { backgroundColor: Colors.danger }]}
              onPress={onConfirm}
            >
              <Text style={dialogStyles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ---------- Card -----------------------------------------------

interface CardProps {
  children: React.ReactNode;
  style?: object;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyles.card, style]} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyles.card, style]}>{children}</View>;
}

// ---------- Divider --------------------------------------------

export function Divider({ indent }: { indent?: number }) {
  return (
    <View style={[dividerStyle.line, indent !== undefined && { marginLeft: indent }]} />
  );
}

// ---------- ListItem -------------------------------------------

interface ListItemProps {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export function ListItem({ icon, iconColor, title, subtitle, right, onPress, showChevron }: ListItemProps) {
  return (
    <TouchableOpacity
      style={listStyles.item}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      {icon && (
        <View style={[listStyles.iconWrap, { backgroundColor: (iconColor ?? Colors.primary) + '20' }]}>
          <Ionicons name={icon as any} size={18} color={iconColor ?? Colors.primary} />
        </View>
      )}
      <View style={listStyles.content}>
        <Text style={listStyles.title}>{title}</Text>
        {subtitle && <Text style={listStyles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View style={listStyles.right}>{right}</View>}
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

// ---- Styles ---------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  rowLabel: { fontSize: Typography.base, color: Colors.textSecondary },
  rowAmount: { fontSize: Typography.base, color: Colors.textPrimary, fontWeight: '600' },
});

const badgeStyles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  label: { fontSize: 12, fontWeight: '600' },
  small: { paddingHorizontal: 6, paddingVertical: 1 },
  smallText: { fontSize: 10 },
});

const dialogStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, width: '100%', ...Shadow.lg,
  },
  title: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  message: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  buttons: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: Typography.base },
  confirmBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '600', fontSize: Typography.base },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
});

const dividerStyle = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.divider },
});

const listStyles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: BorderRadius.sm,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
  },
  content: { flex: 1 },
  title: { fontSize: Typography.base, color: Colors.textPrimary, fontWeight: '500' },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  right: { marginLeft: Spacing.sm },
});
