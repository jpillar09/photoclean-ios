import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePhotos, PhotoItem, PhotoStatus } from "../../App";

const PINE_GREEN = "#1a5c3a";
const PINE_LIGHT = "#e8f5ee";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - 32 - 8) / NUM_COLUMNS;

type FilterType = "all" | "pending" | "keep" | "trash";
type SortType = "newest" | "oldest" | "largest" | "smallest";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "keep", label: "Kept" },
  { key: "trash", label: "Trash" },
];

const SORTS: { key: SortType; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "largest", label: "Largest" },
  { key: "smallest", label: "Smallest" },
];

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GalleryScreen() {
  const { photos, bulkUpdateStatus, permissionGranted } = usePhotos();
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("newest");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredPhotos = useMemo(() => {
    let result = [...photos];
    if (filter !== "all") {
      result = result.filter((p) => p.status === filter);
    }
    switch (sort) {
      case "newest":
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        result.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "largest":
        result.sort((a, b) => b.fileSize - a.fileSize);
        break;
      case "smallest":
        result.sort((a, b) => a.fileSize - b.fileSize);
        break;
    }
    return result;
  }, [photos, filter, sort]);

  const toggleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const allIds = new Set(filteredPhotos.map((p) => p.id));
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBatchAction = (status: PhotoStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const actionLabel = status === "trash" ? "Move to Trash" : status === "keep" ? "Keep" : "Reset";
    Alert.alert(
      `${actionLabel} ${ids.length} photos?`,
      `This will ${status === "trash" ? "mark" : status === "keep" ? "keep" : "reset"} ${ids.length} selected photos.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: actionLabel,
          style: status === "trash" ? "destructive" : "default",
          onPress: () => {
            bulkUpdateStatus(ids, status);
            setSelectedIds(new Set());
            setSelectMode(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  if (!permissionGranted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="images-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>Grant photo access to view gallery</Text>
      </View>
    );
  }

  const statusIcon = (status: PhotoStatus) => {
    if (status === "keep") return <Ionicons name="checkmark-circle" size={16} color={PINE_GREEN} />;
    if (status === "trash") return <Ionicons name="trash" size={16} color="#ef4444" />;
    return null;
  };

  const renderPhoto = ({ item }: { item: PhotoItem }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.photoItem, isSelected && styles.photoItemSelected]}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            toggleSelect(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.uri }} style={styles.photoImage} />
        {/* Status badge */}
        {item.status !== "pending" && (
          <View style={styles.statusBadge}>{statusIcon(item.status)}</View>
        )}
        {/* Selection checkbox */}
        {selectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort & Select Row */}
      <View style={styles.toolbarRow}>
        <ScrollableSort sort={sort} setSort={setSort} />
        <View style={styles.toolbarRight}>
          {selectMode ? (
            <>
              <TouchableOpacity onPress={selectedIds.size === filteredPhotos.length ? deselectAll : selectAll}>
                <Text style={styles.selectAllText}>
                  {selectedIds.size === filteredPhotos.length ? "Deselect All" : "Select All"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setSelectMode(true)}>
              <Text style={styles.selectText}>Select</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Batch Actions */}
      {selectMode && selectedIds.size > 0 && (
        <View style={styles.batchRow}>
          <TouchableOpacity style={styles.batchButton} onPress={() => handleBatchAction("keep")}>
            <Ionicons name="checkmark" size={16} color={PINE_GREEN} />
            <Text style={[styles.batchText, { color: PINE_GREEN }]}>Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.batchButton} onPress={() => handleBatchAction("trash")}>
            <Ionicons name="trash" size={16} color="#ef4444" />
            <Text style={[styles.batchText, { color: "#ef4444" }]}>Trash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.batchButton} onPress={() => handleBatchAction("pending")}>
            <Ionicons name="refresh" size={16} color="#666" />
            <Text style={[styles.batchText, { color: "#666" }]}>Reset</Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>{selectedIds.size} selected</Text>
        </View>
      )}

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="images-outline" size={48} color="#ddd" />
          <Text style={styles.emptyText}>No photos match this filter</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPhotos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function ScrollableSort({ sort, setSort }: { sort: SortType; setSort: (s: SortType) => void }) {
  return (
    <View style={styles.sortRow}>
      {SORTS.map((s) => (
        <TouchableOpacity
          key={s.key}
          style={[styles.sortChip, sort === s.key && styles.sortChipActive]}
          onPress={() => setSort(s.key)}
        >
          <Text style={[styles.sortText, sort === s.key && styles.sortTextActive]}>{s.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterTabActive: {
    backgroundColor: PINE_GREEN,
  },
  filterText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toolbarRight: {
    flexDirection: "row",
    gap: 12,
  },
  selectText: {
    fontSize: 14,
    color: PINE_GREEN,
    fontWeight: "600",
  },
  selectAllText: {
    fontSize: 14,
    color: PINE_GREEN,
    fontWeight: "700",
  },
  cancelText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  sortRow: {
    flexDirection: "row",
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  sortChipActive: {
    backgroundColor: PINE_LIGHT,
  },
  sortText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  sortTextActive: {
    color: PINE_GREEN,
    fontWeight: "700",
  },
  batchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    backgroundColor: "#f9fafb",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  batchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  batchText: {
    fontSize: 13,
    fontWeight: "600",
  },
  selectedCount: {
    marginLeft: "auto",
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  grid: {
    padding: 16,
    gap: 4,
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    margin: 2,
  },
  photoItemSelected: {
    borderWidth: 3,
    borderColor: PINE_GREEN,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10,
    padding: 2,
  },
  checkbox: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: PINE_GREEN,
    borderColor: PINE_GREEN,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
});
