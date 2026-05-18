import React, { useEffect, useState, createContext, useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeScreen from "./src/screens/HomeScreen";
import SwipeScreen from "./src/screens/SwipeScreen";
import GalleryScreen from "./src/screens/GalleryScreen";
import TrashScreen from "./src/screens/TrashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";

// Photo context for sharing state across screens
export type PhotoStatus = "pending" | "keep" | "trash";

export interface PhotoItem {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  fileSize: number;
  createdAt: number;
  status: PhotoStatus;
}

interface PhotoContextType {
  photos: PhotoItem[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoItem[]>>;
  loading: boolean;
  permissionGranted: boolean;
  requestPermission: () => Promise<void>;
  loadPhotos: () => Promise<void>;
  updateStatus: (id: string, status: PhotoStatus) => void;
  bulkUpdateStatus: (ids: string[], status: PhotoStatus) => void;
  trashPhotos: PhotoItem[];
  pendingPhotos: PhotoItem[];
  keptPhotos: PhotoItem[];
  deleteFromDevice: (ids: string[]) => Promise<number>;
}

export const PhotoContext = createContext<PhotoContextType>({} as PhotoContextType);
export const usePhotos = () => useContext(PhotoContext);

const Tab = createBottomTabNavigator();

const PINE_GREEN = "#1a5c3a";

export default function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  const requestPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setPermissionGranted(status === "granted");
    if (status === "granted") {
      await loadPhotos();
    }
  };

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const savedStatuses = await AsyncStorage.getItem("photoStatuses");
      const statusMap: Record<string, PhotoStatus> = savedStatuses
        ? JSON.parse(savedStatuses)
        : {};

      let allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let endCursor: string | undefined;

      while (hasNextPage) {
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: "photo",
          first: 100,
          after: endCursor,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });
        allAssets = [...allAssets, ...page.assets];
        hasNextPage = page.hasNextPage;
        endCursor = page.endCursor;
      }

      const photoItems: PhotoItem[] = allAssets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
        fileSize: (asset as any).fileSize || 0,
        createdAt: asset.creationTime,
        status: statusMap[asset.id] || "pending",
      }));

      setPhotos(photoItems);
    } catch (error) {
      console.error("Failed to load photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (id: string, status: PhotoStatus) => {
    setPhotos((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, status } : p));
      const statusMap: Record<string, PhotoStatus> = {};
      updated.forEach((p) => {
        if (p.status !== "pending") statusMap[p.id] = p.status;
      });
      AsyncStorage.setItem("photoStatuses", JSON.stringify(statusMap));
      return updated;
    });
  };

  const bulkUpdateStatus = (ids: string[], status: PhotoStatus) => {
    setPhotos((prev) => {
      const idSet = new Set(ids);
      const updated = prev.map((p) =>
        idSet.has(p.id) ? { ...p, status } : p
      );
      const statusMap: Record<string, PhotoStatus> = {};
      updated.forEach((p) => {
        if (p.status !== "pending") statusMap[p.id] = p.status;
      });
      AsyncStorage.setItem("photoStatuses", JSON.stringify(statusMap));
      return updated;
    });
  };

  const deleteFromDevice = async (ids: string[]): Promise<number> => {
    try {
      await MediaLibrary.deleteAssetsAsync(ids);
      setPhotos((prev) => {
        const idSet = new Set(ids);
        const updated = prev.filter((p) => !idSet.has(p.id));
        const statusMap: Record<string, PhotoStatus> = {};
        updated.forEach((p) => {
          if (p.status !== "pending") statusMap[p.id] = p.status;
        });
        AsyncStorage.setItem("photoStatuses", JSON.stringify(statusMap));
        return updated;
      });
      return ids.length;
    } catch (error) {
      console.error("Failed to delete photos:", error);
      return 0;
    }
  };

  const trashPhotos = photos.filter((p) => p.status === "trash");
  const pendingPhotos = photos.filter((p) => p.status === "pending");
  const keptPhotos = photos.filter((p) => p.status === "keep");

  useEffect(() => {
    (async () => {
      // Check onboarding status
      const onboardingDone = await AsyncStorage.getItem("onboardingComplete");
      setShowOnboarding(onboardingDone !== "true");

      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status === "granted") {
        setPermissionGranted(true);
        await loadPhotos();
      }
    })();
  }, []);

  // Show nothing while checking onboarding status
  if (showOnboarding === null) return null;

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </>
    );
  }

  return (
    <PhotoContext.Provider
      value={{
        photos,
        setPhotos,
        loading,
        permissionGranted,
        requestPermission,
        loadPhotos,
        updateStatus,
        bulkUpdateStatus,
        trashPhotos,
        pendingPhotos,
        keptPhotos,
        deleteFromDevice,
      }}
    >
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = "home";
              if (route.name === "Home") iconName = focused ? "home" : "home-outline";
              else if (route.name === "Swipe") iconName = focused ? "layers" : "layers-outline";
              else if (route.name === "Gallery") iconName = focused ? "grid" : "grid-outline";
              else if (route.name === "Trash") iconName = focused ? "trash" : "trash-outline";
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: PINE_GREEN,
            tabBarInactiveTintColor: "#999",
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: PINE_GREEN,
            headerTitleStyle: { fontWeight: "700" },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: "PhotoClean" }} />
          <Tab.Screen name="Swipe" component={SwipeScreen} options={{ title: "Swipe" }} />
          <Tab.Screen name="Gallery" component={GalleryScreen} options={{ title: "Gallery" }} />
          <Tab.Screen name="Trash" component={TrashScreen} options={{ title: "Trash" }} />
        </Tab.Navigator>
      </NavigationContainer>
    </PhotoContext.Provider>
  );
}
