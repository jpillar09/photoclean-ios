import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePhotos, PhotoItem } from "../../App";

const PINE_GREEN = "#1a5c3a";
const PINE_LIGHT = "#e8f5ee";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - 32 - 8) / NUM_COLUMNS;

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function TrashScreen() {
  const { trashPhotos, updateStatus, deleteFromDevice, permissionGranted } = usePhotos();
  const [deleting, setDeleting] = useState(false);

  const totalSize = trashPhotos.reduce((sum, p) => sum + p.fileSize, 0);

  const handleRestore = (photo: PhotoItem) => {
    updateStatus(photo.id, "pending");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCleanUp = () => {
    if (trashPhotos.length === 0) return;

    Alert.alert(
      `Permanently delete ${trashPhotos.length} photos?`,
      `This will move ${trashPhotos.length} photo${trashPhotos.length !== 1 ? "s" : ""} to your device's Recently Deleted folder and free up ${formatSize(totalSize)}.\n\nYou can recover them from Recently Deleted within 30 days.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clean Up",
          style: "destructive",
          onPress: () => confirmCleanUp(),
        },
      ]
    );
  };

  const confirmCleanUp = async () => {
    setDeleting(true);
    try {
      const ids = trashPhotos.map((p) => p.id);
      const deleted = await deleteFromDevice(ids);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Done!",
        `${deleted} photos moved to Recently Deleted. ${formatSize(totalSize)} freed.`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to delete some photos. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (!permissionGranted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="trash-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>Grant photo access to view trash</Text>
      </View>
    );
  }

  const renderPhoto = ({ item }: { item: PhotoItem }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.uri }} style={styles.photoImage} />
      <TouchableOpacity style={styles.restoreButton} onPress={() => handleRestore(item)}>
        <Ionicons name="arrow-undo" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Storage Savings Header */}
      <View style={styles.header}>
        <View style={styles.savingsCard}>
          <View style={styles.savingsIcon}>
            <Ionicons name="cloud-done" size={24} color={PINE_GREEN} />
          </View>
          <View style={styles.savingsInfo}>
            <Text style={styles.savingsAmount}>{formatSize(totalSize)}</Text>
            <Text style={styles.savingsLabel}>
              {trashPhotos.length} photo{trashPhotos.length !== 1 ? "s" : ""} to be freed
            </Text>
          </View>
        </View>

        {trashPhotos.length > 0 && (
          <TouchableOpacity
            style={styles.cleanUpButton}
            onPress={handleCleanUp}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.cleanUpText}>Clean Up</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.infoText}>
          Photos will be moved to Recently Deleted (recoverable for 30 days). Tap the undo icon on any photo to restore it.
        </Text>
      </View>

      {/* Trash Grid */}
      {trashPhotos.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="sparkles-outline" size={56} color={PINE_GREEN} />
          <Text style={styles.emptyTitle}>Trash is empty</Text>
          <Text style={styles.emptySubtitle}>
            Photos you swipe left on will appear here for review before deletion.
          </Text>
        </View>
      ) : (
        <FlatList
          data={trashPhotos}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  savingsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  savingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PINE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  savingsInfo: {
    flex: 1,
  },
  savingsAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  savingsLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  cleanUpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cleanUpText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  grid: {
    padding: 16,
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    margin: 2,
    opacity: 0.75,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  restoreButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
});
