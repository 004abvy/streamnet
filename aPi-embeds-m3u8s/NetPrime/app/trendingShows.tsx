import React, { useRef, useState } from "react";
import {
  Button,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useMovieContext } from "@/contexts/movieContext";
import { Series } from "@/contexts/movieContext/types";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

const { width } = Dimensions.get("window");

export default function TrendingShowsScreen() {
  const {
    series,
    loadingSeries,
    error,
    seriesCurrentPage,
    seriesTotalPages,
    fetchPopularSeries,
    seriesHasMore,
  } = useMovieContext();

  const colorScheme = useColorScheme();
  const color = Colors[colorScheme ?? "dark"];
  const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
  const router = useRouter();
  
  const flatListRef = useRef<FlatList>(null);
  const [showGoToTop, setShowGoToTop] = useState(false);

  const handlePress = (id: number) => {
    router.push({
      pathname: "/(player)/tvDetails",
      params: { id: id.toString() },
    });
  };

  const renderItem = ({ item }: { item: Series }) => (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={() => handlePress(item.id)}
    >
      {item.poster_path ? (
        <Image
          source={{ uri: `https://image.tmdb.org/t/p/w200${item.poster_path}` }}
          style={[styles.posterImage, { backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#ebebeb" }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={600}
        />
      ) : (
        <View style={styles.noPoster}>
          <Text style={styles.noPosterText}>No Image</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const handleEndReached = () => {
    if (!loadingSeries && seriesHasMore && seriesCurrentPage < seriesTotalPages) {
      fetchPopularSeries(seriesCurrentPage + 1);
    }
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  if (error && series.length === 0) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: color.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color={color.icon} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: color.text }]}>Trending Shows</Text>
        </View>
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Button title="Retry" onPress={() => fetchPopularSeries(1)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: color.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color={color.icon} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: color.text }]}>Trending Shows</Text>
      </View>
      
      <FlatList
        ref={flatListRef}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          setShowGoToTop(offsetY > 400);
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        data={series}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.container}
        columnWrapperStyle={styles.columnWrapper}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingSeries ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
              <ShimmerPlaceholder
                shimmerColors={
                  colorScheme === "dark" ? ["#1a1a1a", "#2a2a2a", "#1a1a1a"] : ["#ebebeb", "#d3d3d3", "#ebebeb"]
                }
                duration={1200}
                style={{
                  height: 250,
                  width: (width - 30) / 2,
                  borderRadius: 20,
                }}
              />
              <ShimmerPlaceholder
                shimmerColors={
                  colorScheme === "dark" ? ["#1a1a1a", "#2a2a2a", "#1a1a1a"] : ["#ebebeb", "#d3d3d3", "#ebebeb"]
                }
                duration={1200}
                delay={150}
                style={{
                  height: 250,
                  width: (width - 30) / 2,
                  borderRadius: 20,
                }}
              />
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
      {showGoToTop && (
        <TouchableOpacity
          style={[styles.fabContainer, { backgroundColor: color.tint }]}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <View style={styles.fabInner}>
            <MaterialIcons name="arrow-upward" size={20} color={color.background} />
            <Text style={[styles.fabText, { color: color.background }]}>Top</Text>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  container: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  movieCard: {
    width: (width - 30) / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  posterImage: {
    width: "100%",
    height: 250,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 10, height: 10 },
  },
  noPoster: {
    width: "100%",
    height: 250,
    backgroundColor: "#ccc",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  noPosterText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
  },
  fabContainer: {
    position: "absolute",
    bottom: 25,
    alignSelf: "center",
    zIndex: 1000,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fabInner: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fabText: {
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
