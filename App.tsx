
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.title}>Home-Cooked Marketplace</Text>

      <Text style={styles.subtitle}>
        Discover delicious homemade meals from local home cooks.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome!</Text>
        <Text style={styles.cardText}>
          Find homemade meals or share your cooking with your community.
        </Text>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Explore Meals</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>
          Become a Home Cook
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
});
