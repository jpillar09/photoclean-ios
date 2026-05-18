import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePhotos } from "../../App";
import Svg, { Circle } from "react-native-svg";

const PINE_GREEN = "#1a5c3a";
const PINE_LIGHT = "#e8f5ee";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function ProgressRing({ progress, size = 140, strokeWidth = 10 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          stroke="#e5e7eb"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={PINE_GREEN}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: PINE_GREEN }}>
          {Math.round(progress)}%
        </Text>
        <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>reviewed</Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { photos, loading, permissionGranted, requestPermission, pendingPhotos, keptPhotos, trashPhotos } = usePhotos();

  const totalReviewed = keptPhotos.length + trashPhotos.length;
  const progress = photos.length > 0 ? (totalReviewed / photos.length) * 100 : 0;
  const trashSize = trashPhotos.reduce((sum, p) => sum + p.fileSize, 0);

  if (!permissionGranted) {
    return (
      <View style={styles.centered}>
        <View style={styles.iconContainer}>
          <Ionicons name="images" size={64} color={PINE_GREEN} />
        </View>
        <Text style={styles.title}>Welcome to PhotoClean</Text>
        <Text style={styles.subtitle}>
          Declutter your photo library effortlessly. Swipe to decide, let AI find the clutter, and free up space in seconds.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Ionicons name="lock-open" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Grant Photo Access</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          We only read your photos to display them. Nothing is uploaded without your action.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PINE_GREEN} />
        <Text style={[styles.subtitle, { marginTop: 16 }]}>Loading your photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Ring */}
      <View style={styles.progressSection}>
        <ProgressRing progress={progress} />
        <Text style={styles.progressLabel}>
          {totalReviewed} of {photos.length} photos reviewed
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{pendingPhotos.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color={PINE_GREEN} />
          <Text style={styles.statNumber}>{keptPhotos.length}</Text>
          <Text style={styles.statLabel}>Kept</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
          <Text style={styles.statNumber}>{trashPhotos.length}</Text>
          <Text style={styles.statLabel}>Trash</Text>
        </View>
      </View>

      {/* Space Savings */}
      {trashPhotos.length > 0 && (
        <View style={styles.savingsCard}>
          <Ionicons name="cloud-done-outline" size={20} color={PINE_GREEN} />
          <Text style={styles.savingsText}>
            {formatSize(trashSize)} ready to be freed
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        {pendingPhotos.length > 0 && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Swipe")}
          >
            <Ionicons name="layers-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Start Swiping</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Gallery")}
        >
          <Ionicons name="grid-outline" size={20} color={PINE_GREEN} />
          <Text style={styles.secondaryButtonText}>View Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: PINE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 20,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PINE_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
    width: "100%",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PINE_LIGHT,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
    width: "100%",
  },
  secondaryButtonText: {
    color: PINE_GREEN,
    fontSize: 16,
    fontWeight: "600",
  },
  progressSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  progressLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  savingsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PINE_LIGHT,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 24,
  },
  savingsText: {
    fontSize: 14,
    color: PINE_GREEN,
    fontWeight: "600",
  },
  actionsSection: {
    gap: 12,
    marginTop: "auto",
    paddingBottom: 20,
  },
});
