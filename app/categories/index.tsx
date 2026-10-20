// ============================================================
// RentLedger — Categories Management Screen
// System & Custom Income / Expense Categories
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Stack , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDatabase } from '../../src/hooks/useDatabase';
import { queryAll, executeSQL } from '../../src/db/database';
import type { Category, TransactionType } from '../../src/models/types';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { Colors, Spacing, Typography, BorderRadius, Shadow } from '../../src/constants/theme';

export default function CategoriesScreen() {
  const { db, isReady } = useDatabase();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<TransactionType>('income');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('income');

  const loadCategories = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const rows = await queryAll<Category>(
        db,
        'SELECT * FROM categories ORDER BY is_system DESC, name ASC'
      );
      setCategories(rows);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && db) {
        loadCategories();
      }
    }, [isReady, db, loadCategories])
  );

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Required Field', 'Please enter a category name.');
      return;
    }
    if (!db) return;

    try {
      await executeSQL(
        db,
        'INSERT INTO categories (type, name, is_system) VALUES (?, ?, 0)',
        [newCatType, newCatName.trim()]
      );
      setNewCatName('');
      setModalVisible(false);
      loadCategories();
    } catch (err) {
      Alert.alert('Error', 'Category already exists or could not be saved.');
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    if (cat.is_system) {
      Alert.alert('System Category', 'Default system categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"? Existing transactions will retain their category name.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!db) return;
            await executeSQL(db, 'DELETE FROM categories WHERE id = ?', [cat.id]);
            loadCategories();
          },
        },
      ]
    );
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Categories',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                setNewCatType(activeTab);
                setModalVisible(true);
              }}
              style={styles.headerBtn}
            >
              <Ionicons name="add" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Income / Expense Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'income' && styles.tabActive]}
            onPress={() => setActiveTab('income')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'income' && styles.tabTextActive,
              ]}
            >
              Income Categories
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'expense' && styles.tabActive]}
            onPress={() => setActiveTab('expense')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'expense' && styles.tabTextActive,
              ]}
            >
              Expense Categories
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <LoadingSpinner message="Loading Categories..." />
        ) : (
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.categoryRow}>
                <View style={styles.catLeft}>
                  <Text style={styles.catName}>{item.name}</Text>
                  {item.is_system ? (
                    <View style={styles.badgeWrap}>
                      <Ionicons name="lock-closed" size={12} color={Colors.textTertiary} />
                      <Text style={styles.badgeText}>System</Text>
                    </View>
                  ) : (
                    <Text style={styles.customBadgeText}>Custom</Text>
                  )}
                </View>

                {!item.is_system && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(item)}
                    style={styles.deleteIconBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}
      </View>

      {/* Add Category Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Custom Category</Text>

            <View style={styles.modalTypeRow}>
              <TouchableOpacity
                style={[
                  styles.modalTypeBtn,
                  newCatType === 'income' && styles.modalTypeBtnActive,
                ]}
                onPress={() => setNewCatType('income')}
              >
                <Text
                  style={[
                    styles.modalTypeText,
                    newCatType === 'income' && styles.modalTypeTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTypeBtn,
                  newCatType === 'expense' && styles.modalTypeBtnActive,
                ]}
                onPress={() => setNewCatType('expense')}
              >
                <Text
                  style={[
                    styles.modalTypeText,
                    newCatType === 'expense' && styles.modalTypeTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Category Name (e.g. Garden Maintenance)"
              placeholderTextColor={Colors.textTertiary}
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddCategory}>
                <Text style={styles.saveBtnText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBtn: {
    paddingHorizontal: Spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 6,
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    ...Shadow.sm,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  catName: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  customBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  deleteIconBtn: {
    padding: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadow.lg,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalTypeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  modalTypeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalTypeText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  cancelBtnText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Typography.base,
  },
});
