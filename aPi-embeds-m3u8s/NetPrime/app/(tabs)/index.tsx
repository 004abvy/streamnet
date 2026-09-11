// app/index.tsx (if using Expo Router and _layout.tsx)

import MovieList from "@/components/movieList"; // Adjust path based on your structure
import PopularList from "@/components/popularList";
import { Colors } from "@/constants/Colors";
import { useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
// import { ScrollView } from "react-native-gesture-handler";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default React.memo(function HomePage() {
  const colorScheme = useColorScheme();
  const color = Colors[colorScheme ?? "dark"];
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Simulate loading for shimmer demo (replace with real loading logic)

  return (
    <SafeAreaView
      edges={['top']}
      style={{
        backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
        flex: 1,
      }}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <PopularList

        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: color.text }]}>Trending Shows</Text>
              <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 5 }} onPress={() => router.push("/trendingShows")}>
                <Text style={[styles.seeAll, { color: color.tabIconDefault }]}>See All</Text>
                <Ionicons name="arrow-forward" size={18} color={color.tabIconDefault} />
              </TouchableOpacity>
            </View>
            <MovieList />
            <Text style={[styles.title, { color: color.text, paddingHorizontal: 20, marginBottom: 15 }]}>Now Playing</Text>
          </>
        }
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // padding: 10,
    // overflow: "visible",
    // paddingBottom: 80, // Add bottom padding to ensure content is not hidden behind the tab bar
  },
  title: {
    fontWeight: "bold",
    fontSize: 30,
    fontStyle: "normal",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  seeAll: {
    fontSize: 16,
    fontWeight: "600",
  },
});
