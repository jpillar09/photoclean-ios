import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePhotos, PhotoItem } from "../../App";
import { analyzePhotos, localAnalysis } from "../services/api";

const PINE_GREEN = "#1a5c3a";
const PINE_LIGHT = "#e8f5ee";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

const API_BASE = "https://aiphotoclean.com";

const QUICK_PRESETS = [
  { label: "Blurry", prompt: "blurry or out of focus photos" },
  { label: "Screenshots", prompt: "screenshots of phone or computer screens" },
  { label: "Duplicates", prompt: "photos that look very similar or are duplicates" },
  { label: "Memes", prompt: "memes, funny images, or downloaded internet images" },
  { label: "Receipts", prompt: "photos of receipts, bills, or documents" },
];

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function SwipeScreen() {
  const { pendingPhotos, updateStatus, bulkUpdateStatus } = usePhotos();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<string[] | null>(null);
  const [undoStack, setUndoStack] = useState<{ id: string; action: "keep" | "trash" }[]>([]);
  const [sessionStats, setSessionStats] = useState({ kept: 0, trashed: 0, bytes: 0 });

  // Animation values
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });
  const keepOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const trashOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const currentPhoto = pendingPhotos[currentIndex];

  const swipeRight = useCallback(() => {
    if (!currentPhoto) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      updateStatus(currentPhoto.id, "keep");
      setUndoStack((prev) => [...prev, { id: currentPhoto.id, action: "keep" }]);
      setSessionStats((prev) => ({ ...prev, kept: prev.kept + 1 }));
      position.setValue({ x: 0, y: 0 });
    });
  }, [currentPhoto]);

  const swipeLeft = useCallback(() => {
    if (!currentPhoto) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      updateStatus(currentPhoto.id, "trash");
      setUndoStack((prev) => [...prev, { id: currentPhoto.id, action: "trash" }]);
      setSessionStats((prev) => ({
        ...prev,
        trashed: prev.trashed + 1,
        bytes: prev.bytes + (currentPhoto.fileSize || 0),
      }));
      position.setValue({ x: 0, y: 0 });
    });
  }, [currentPhoto]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    updateStatus(last.id, "pending");
    setUndoStack((prev) => prev.slice(0, -1));
    if (last.action === "keep") {
      setSessionStats((prev) => ({ ...prev, kept: prev.kept - 1 }));
    } else {
      setSessionStats((prev) => ({ ...prev, trashed: prev.trashed - 1 }));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const [aiProgress, setAiProgress] = useState({ analyzed: 0, total: 0 });

  const handleAiAnalyze = async (queryPrompt: string) => {
    if (!queryPrompt.trim()) return;
    setAnalyzing(true);
    setAiResults(null);
    try {
      // First try local heuristic analysis (instant, no network needed)
      const localMatches = localAnalysis(
        queryPrompt,
        pendingPhotos.map((p) => ({
          id: p.id,
          filename: p.filename,
          fileSize: p.fileSize,
          width: p.width,
          height: p.height,
        }))
      );

      if (localMatches.length > 0) {
        setAiResults(localMatches);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Try backend AI analysis for more complex queries
        setAiProgress({ analyzed: 0, total: pendingPhotos.length });
        const photosToAnalyze = pendingPhotos.slice(0, 20).map((p) => ({
          id: p.id,
          uri: p.uri,
        }));

        const matches = await analyzePhotos(
          queryPrompt,
          photosToAnalyze,
          (analyzed, total) => setAiProgress({ analyzed, total })
        );

        if (matches.length > 0) {
          setAiResults(matches);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert(
            "No Matches",
            `No photos matching "${queryPrompt}" were found. Try a different description.`
          );
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to analyze photos. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTrashAiResults = () => {
    if (aiResults && aiResults.length > 0) {
      bulkUpdateStatus(aiResults, "trash");
      setAiResults(null);
    }
  };

  // Session complete
  if (pendingPhotos.length === 0 && (sessionStats.kept > 0 || sessionStats.trashed > 0)) {
    return (
      <View style={styles.centered}>
        <View style={styles.summaryCard}>
          <Ionicons name="checkmark-circle" size={56} color={PINE_GREEN} />
          <Text style={styles.summaryTitle}>Session Complete!</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatRow}>
              <Ionicons name="checkmark" size={20} color={PINE_GREEN} />
              <Text style={styles.summaryStatText}>{sessionStats.kept} photos kept</Text>
            </View>
            <View style={styles.summaryStatRow}>
              <Ionicons name="trash" size={20} color="#ef4444" />
              <Text style={styles.summaryStatText}>{sessionStats.trashed} photos trashed</Text>
            </View>
            <View style={styles.summaryStatRow}>
              <Ionicons name="cloud-done" size={20} color={PINE_GREEN} />
              <Text style={styles.summaryStatText}>{formatSize(sessionStats.bytes)} to be freed</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // No pending photos
  if (pendingPhotos.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle-outline" size={64} color={PINE_GREEN} />
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptySubtitle}>No pending photos to review.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* AI Prompt Section */}
      <View style={styles.aiSection}>
        <View style={styles.promptRow}>
          <TextInput
            style={styles.promptInput}
            placeholder="Describe photos to find..."
            placeholderTextColor="#999"
            value={prompt}
            onChangeText={setPrompt}
            returnKeyType="send"
            onSubmitEditing={() => handleAiAnalyze(prompt)}
          />
          <TouchableOpacity
            style={[styles.sendButton, !prompt.trim() && { opacity: 0.5 }]}
            onPress={() => handleAiAnalyze(prompt)}
            disabled={!prompt.trim() || analyzing}
          >
            {analyzing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
          {QUICK_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={styles.presetChip}
              onPress={() => {
                setPrompt(preset.prompt);
                handleAiAnalyze(preset.prompt);
              }}
            >
              <Text style={styles.presetText}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* AI Results Panel */}
      {analyzing && (
        <View style={styles.analyzingPanel}>
          <ActivityIndicator size="small" color={PINE_GREEN} />
          <Text style={styles.analyzingText}>
            Analyzing {aiProgress.analyzed}/{aiProgress.total} photos...
          </Text>
        </View>
      )}

      {aiResults && aiResults.length > 0 && (
        <View style={styles.aiResultsPanel}>
          <View style={styles.aiResultsHeader}>
            <Text style={styles.aiResultsTitle}>
              {aiResults.length} photo{aiResults.length !== 1 ? "s" : ""} found
            </Text>
            <View style={styles.aiResultsActions}>
              <TouchableOpacity
                style={styles.aiTrashAllButton}
                onPress={handleTrashAiResults}
              >
                <Ionicons name="trash" size={14} color="#fff" />
                <Text style={styles.aiTrashAllText}>Trash All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAiResults(null)}>
                <Ionicons name="close-circle" size={22} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            horizontal
            data={pendingPhotos.filter((p) => aiResults.includes(p.id))}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Image source={{ uri: item.uri }} style={styles.aiThumb} />
            )}
            style={styles.aiThumbList}
          />
        </View>
      )}

      {/* Swipe Card */}
      <View style={styles.cardContainer}>
        {currentPhoto && (
          <Animated.View
            style={[
              styles.card,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Image source={{ uri: currentPhoto.uri }} style={styles.cardImage} resizeMode="cover" />
            {/* Keep overlay */}
            <Animated.View style={[styles.overlay, styles.keepOverlay, { opacity: keepOpacity }]}>
              <Text style={styles.overlayText}>KEEP</Text>
            </Animated.View>
            {/* Trash overlay */}
            <Animated.View style={[styles.overlay, styles.trashOverlay, { opacity: trashOpacity }]}>
              <Text style={styles.overlayText}>DELETE</Text>
            </Animated.View>
            {/* Photo info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardFilename} numberOfLines={1}>{currentPhoto.filename}</Text>
              <Text style={styles.cardSize}>{formatSize(currentPhoto.fileSize)}</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.undoButton]}
          onPress={handleUndo}
          disabled={undoStack.length === 0}
        >
          <Ionicons name="arrow-undo" size={24} color={undoStack.length > 0 ? "#f59e0b" : "#ccc"} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.trashButton]} onPress={swipeLeft}>
          <Ionicons name="close" size={32} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.keepButton]} onPress={swipeRight}>
          <Ionicons name="checkmark" size={32} color={PINE_GREEN} />
        </TouchableOpacity>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{pendingPhotos.length} left</Text>
        </View>
      </View>

      {/* Swipe hints */}
      <View style={styles.hintsRow}>
        <Text style={styles.hintText}>← Delete</Text>
        <Text style={styles.hintText}>Keep →</Text>
      </View>
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
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  aiSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  promptRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  promptInput: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a1a",
  },
  sendButton: {
    backgroundColor: PINE_GREEN,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  presetsRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  presetChip: {
    backgroundColor: PINE_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  presetText: {
    fontSize: 13,
    color: PINE_GREEN,
    fontWeight: "600",
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_HEIGHT * 0.48,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  keepOverlay: {
    backgroundColor: "rgba(26, 92, 58, 0.3)",
  },
  trashOverlay: {
    backgroundColor: "rgba(239, 68, 68, 0.3)",
  },
  overlayText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 4,
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardFilename: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  cardSize: {
    color: "#ddd",
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 16,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  undoButton: {
    borderColor: "#f59e0b",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  trashButton: {
    borderColor: "#ef4444",
  },
  keepButton: {
    borderColor: PINE_GREEN,
  },
  counterBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  counterText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  hintsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 48,
    paddingBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: "#999",
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 20,
    padding: 32,
    width: "100%",
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 20,
  },
  summaryStats: {
    gap: 12,
    width: "100%",
  },
  summaryStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryStatText: {
    fontSize: 15,
    color: "#333",
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
  },
  analyzingPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    marginHorizontal: 16,
    backgroundColor: PINE_LIGHT,
    borderRadius: 10,
  },
  analyzingText: {
    fontSize: 13,
    color: PINE_GREEN,
    fontWeight: "500",
  },
  aiResultsPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
  },
  aiResultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  aiResultsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  aiResultsActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aiTrashAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiTrashAllText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  aiThumbList: {
    maxHeight: 60,
  },
  aiThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 6,
  },
});
