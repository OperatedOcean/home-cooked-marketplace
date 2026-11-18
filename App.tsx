
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const meals = [
  {
    id: 1,
    name: 'Homemade Chicken and Rice',
    cook: 'Sarah',
    price: 12.99,
    description: 'Tender chicken served with seasoned rice and vegetables.',
    category: 'American',
  },
  {
    id: 2,
    name: 'Turkish Manti',
    cook: 'Ayse',
    price: 14.99,
    description: 'Traditional Turkish dumplings with yogurt and garlic sauce.',
    category: 'Turkish',
  },
  {
    id: 3,
    name: 'Fresh Homemade Lasagna',
    cook: 'Maria',
    price: 15.99,
    description: 'Layers of pasta, homemade tomato sauce, and melted cheese.',
    category: 'Italian',
  },
  {
    id: 4,
    name: 'Chicken Biryani',
    cook: 'Aisha',
    price: 13.99,
    description: 'Fragrant basmati rice cooked with chicken and aromatic spices.',
    category: 'Indian',
  },
  {
    id: 5,
    name: 'Beef Tacos',
    cook: 'Sofia',
    price: 10.99,
    description: 'Fresh tortillas filled with seasoned beef and vegetables.',
    category: 'Mexican',
  },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');

  if (currentScreen === 'meals') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.mealsContent}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Explore Homemade Meals</Text>

          <Text style={styles.subtitle}>
            Discover fresh, delicious meals prepared by home cooks in your community.
          </Text>

          <Text style={styles.sectionTitle}>Available Meals</Text>

          {meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealPrice}>
                  ${meal.price.toFixed(2)}
                </Text>
              </View>

              <Text style={styles.mealCategory}>
                {meal.category}
              </Text>

              <Text style={styles.mealDescription}>
                {meal.description}
              </Text>

              <Text style={styles.mealCook}>
                Prepared by {meal.cook}
              </Text>

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => setCurrentScreen(`meal-${meal.id}`)}
              >
                <Text style={styles.viewButtonText}>
                  View Details
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentScreen.startsWith('meal-')) {
    const mealId = Number(currentScreen.replace('meal-', ''));
    const selectedMeal = meals.find((meal) => meal.id === mealId);

    if (selectedMeal) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar style="dark" />

          <ScrollView
            contentContainerStyle={styles.detailsContent}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen('meals')}
            >
              <Text style={styles.backButtonText}>
                Back to Meals
              </Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {selectedMeal.name}
            </Text>

            <View style={styles.card}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                ${selectedMeal.price.toFixed(2)}
              </Text>

              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>
                {selectedMeal.category}
              </Text>

              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>
                {selectedMeal.description}
              </Text>

              <Text style={styles.detailLabel}>Home Cook</Text>
              <Text style={styles.detailValue}>
                {selectedMeal.cook}
              </Text>
            </View>

            <Text style={styles.noticeText}>
              Ordering functionality is coming soon.
            </Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
  }

  if (currentScreen === 'cook') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <View style={styles.homeContent}>
          <Text style={styles.title}>
            Become a Home Cook
          </Text>

          <Text style={styles.subtitle}>
            Share your homemade meals with people in your community and earn additional income.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Start Selling Your Meals
            </Text>

            <Text style={styles.cardText}>
              Soon, home cooks will be able to create profiles, list homemade dishes, and connect with customers.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.buttonText}>
              Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.homeContent}>
        <Text style={styles.title}>
          Home-Cooked Marketplace
        </Text>

        <Text style={styles.subtitle}>
          Discover delicious homemade meals from local home cooks.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome!</Text>

          <Text style={styles.cardText}>
            Find homemade meals or share your cooking with your community.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setCurrentScreen('meals')}
        >
          <Text style={styles.buttonText}>
            Explore Meals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentScreen('cook')}
        >
          <Text style={styles.secondaryButtonText}>
            Become a Home Cook
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },
  homeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollView: {
    flex: 1,
  },
  mealsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  detailsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2D4934',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D4934',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#555555',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#2D4934',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderColor: '#2D4934',
    borderWidth: 2,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2D4934',
    fontSize: 17,
    fontWeight: 'bold',
  },
  backButton: {
    marginBottom: 24,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#2D4934',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D4934',
    marginBottom: 20,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D4934',
    flex: 1,
    marginRight: 12,
  },
  mealPrice: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D4934',
  },
  mealCategory: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 12,
  },
  mealDescription: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 22,
    marginBottom: 12,
  },
  mealCook: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 16,
  },
  viewButton: {
    backgroundColor: '#2D4934',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D4934',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 16,
    color: '#555555',
    lineHeight: 24,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 15,
    color: '#777777',
    textAlign: 'center',
  },
});
