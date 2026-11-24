import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Image,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './utils/supabase';

type Listing = {
  id: string;
  cook_id: string;
  title: string;
  description: string;
  price: number;
  portions: number;
  image_url: string | null;
  location: string;
  is_available: boolean;
};

type Order = {
  id: string;
  listing_id: string | null;
  customer_id: string;
  cook_id: string;
  meal_title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  created_at: string;
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
};

function Button({
  label,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryButtonText,
          danger && styles.dangerButtonText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function money(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(
        (error as { message?: string })?.message ?? error
      );
}

export default function App() {
  const [currentScreen, setCurrentScreen] =
    useState('home');

  const [session, setSession] =
    useState<Session | null>(null);

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // Authentication and profiles

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [isCook, setIsCook] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileReady, setProfileReady] =
    useState(false);

  // Food listings

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [listingError, setListingError] =
    useState('');

  const [loadingListings, setLoadingListings] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [mealTitle, setMealTitle] = useState('');
  const [mealDescription, setMealDescription] =
    useState('');

  const [mealPrice, setMealPrice] = useState('');
  const [mealPortions, setMealPortions] =
    useState('');

  const [mealLocation, setMealLocation] =
    useState('');

  const [mealImage, setMealImage] = useState('');
  const [mealBase64, setMealBase64] = useState('');
  const [available, setAvailable] = useState(true);

  const [detailsBack, setDetailsBack] =
    useState('meals');

  // Customer orders

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [orderError, setOrderError] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [selectedListing, setSelectedListing] =
    useState<Listing | null>(null);

  const userId = session?.user.id;

  // Authentication listener

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setReady(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load user profile

  useEffect(() => {
    let active = true;

    setProfileReady(false);
    setFullName('');
    setBio('');
    setLocation('');
    setIsCook(false);
    setAvatarUrl('');
    setListings([]);
    setOrders([]);
    setSelectedListing(null);

    if (userId) {
      supabase
        .from('profiles')
        .select('full_name,bio,location,is_cook,avatar_url')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!active) return;

          if (error) {
            Alert.alert('Profile error', error.message);
            return;
          }

          setFullName(data?.full_name ?? '');
          setBio(data?.bio ?? '');
          setLocation(data?.location ?? '');
          setIsCook(data?.is_cook ?? false);
          setAvatarUrl(data?.avatar_url ?? '');
          setProfileReady(true);
        });
    }

    return () => {
      active = false;
    };
  }, [userId]);

  // Refresh screens when opened

  useEffect(() => {
    if (!userId) return;

    if (
      currentScreen === 'meals' ||
      currentScreen === 'my-listings'
    ) {
      void loadListings();
    }

    if (
      currentScreen === 'my-orders' ||
      currentScreen === 'incoming-orders'
    ) {
      void loadOrders();
    }
  }, [currentScreen, userId]);

  // Authentication

  async function authenticate(signUp: boolean) {
    if (!email.trim() || !password) {
      Alert.alert('Enter your email and password');
      return;
    }

    setBusy(true);

    try {
      const credentials = {
        email: email.trim(),
        password,
      };

      const { data, error } = signUp
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(
            credentials
          );

      if (error) throw error;

      setPassword('');

      if (signUp && !data.session) {
        Alert.alert(
          'Check your email',
          'Confirm your email address before logging in.'
        );

        setCurrentScreen('login');
      } else {
        setCurrentScreen('profile');
      }
    } catch (error) {
      Alert.alert(
        'Authentication error',
        errorMessage(error)
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (busy) return;

    setBusy(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setListings([]);
      setOrders([]);
      setSelectedListing(null);
      setMealImage('');
      setMealBase64('');
      setPassword('');
      setCurrentScreen('home');
    } catch (error) {
      Alert.alert('Logout failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // Profile management

  async function saveProfile() {
    if (!userId || !profileReady || busy) return;

    setBusy(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName.trim(),
          bio,
          location: location.trim(),
          is_cook: isCook,
        });

      if (error) throw error;

      Alert.alert('Profile saved');
      setCurrentScreen('profile');
    } catch (error) {
      Alert.alert('Save failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function chooseProfilePicture() {
    if (!userId || !profileReady || busy) return;

    setBusy(true);

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
          base64: true,
        });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        throw new Error('Could not read image.');
      }

      const bytes = decode(asset.base64);

      if (bytes.byteLength > 5 * 1024 * 1024) {
        throw new Error(
          'Please choose an image smaller than 5 MB.'
        );
      }

      const path =
        `${userId}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } =
        await supabase.storage
          .from('avatars')
          .upload(path, bytes, {
            contentType: 'image/jpeg',
          });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: data.publicUrl,
        });

      if (profileError) {
        await supabase.storage
          .from('avatars')
          .remove([path]);

        throw profileError;
      }

      const oldPath = avatarUrl.split(
        '/storage/v1/object/public/avatars/'
      )[1];

      setAvatarUrl(data.publicUrl);

      if (oldPath?.startsWith(`${userId}/`)) {
        await supabase.storage
          .from('avatars')
          .remove([oldPath]);
      }

      Alert.alert('Profile picture saved');
    } catch (error) {
      Alert.alert(
        'Picture upload failed',
        errorMessage(error)
      );
    } finally {
      setBusy(false);
    }
  }

  // Load food listings

  async function loadListings() {
    if (!userId) return;

    setLoadingListings(true);
    setListingError('');

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setListings(data ?? []);
    } catch (error) {
      setListings([]);
      setListingError(errorMessage(error));
    } finally {
      setLoadingListings(false);
    }
  }

  function openListingForm(item?: Listing) {
    setEditingId(item?.id ?? null);
    setMealTitle(item?.title ?? '');
    setMealDescription(item?.description ?? '');
    setMealPrice(item ? String(item.price) : '');
    setMealPortions(item ? String(item.portions) : '');
    setMealLocation(item?.location ?? location);
    setMealImage(item?.image_url ?? '');
    setMealBase64('');
    setAvailable(item?.is_available ?? true);
    setCurrentScreen('listing-form');
  }

  async function chooseMealImage() {
    if (busy) return;

    setBusy(true);

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.6,
          base64: true,
        });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        throw new Error('Could not read image.');
      }

      if (
        decode(asset.base64).byteLength >
        5 * 1024 * 1024
      ) {
        throw new Error(
          'Please choose an image smaller than 5 MB.'
        );
      }

      setMealImage(asset.uri);
      setMealBase64(asset.base64);
    } catch (error) {
      Alert.alert('Image error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveListing() {
    if (!userId || !profileReady || !isCook || busy) {
      return;
    }

    const price = Number(mealPrice);
    const portions = Number(mealPortions);

    if (
      !mealTitle.trim() ||
      !mealDescription.trim() ||
      !mealLocation.trim() ||
      !mealPrice.trim() ||
      !mealPortions.trim() ||
      !Number.isFinite(price) ||
      price < 0.01 ||
      price > 99999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(mealPrice.trim()) ||
      !Number.isInteger(portions) ||
      portions < 0 ||
      portions > 2147483647 ||
      (!editingId && portions === 0)
    ) {
      Alert.alert(
        'Check your listing',
        'Enter a valid meal name, description, price, location, and number of portions.'
      );

      return;
    }

    setBusy(true);

    let uploadedPath = '';

    try {
      let imageUrl = mealImage || null;

      const previousListing = listings.find(
        (item) => item.id === editingId
      );

      if (mealBase64) {
        const path =
          `${userId}/meal-${Date.now()}.jpg`;

        const { error } = await supabase.storage
          .from('food-images')
          .upload(path, decode(mealBase64), {
            contentType: 'image/jpeg',
          });

        if (error) throw error;

        uploadedPath = path;

        imageUrl = supabase.storage
          .from('food-images')
          .getPublicUrl(path).data.publicUrl;
      }

      const values = {
        cook_id: userId,
        title: mealTitle.trim(),
        description: mealDescription.trim(),
        price,
        portions,
        location: mealLocation.trim(),
        image_url: imageUrl,
        is_available: available && portions > 0,
      };

      const query = editingId
        ? supabase
            .from('listings')
            .update(values)
            .eq('id', editingId)
            .eq('cook_id', userId)
        : supabase
            .from('listings')
            .insert(values);

      const { error } = await query
        .select('id')
        .single();

      if (error) throw error;

      uploadedPath = '';

      if (mealBase64 && previousListing?.image_url) {
        const oldPath = previousListing.image_url.split(
          '/storage/v1/object/public/food-images/'
        )[1];

        if (oldPath?.startsWith(`${userId}/`)) {
          await supabase.storage
            .from('food-images')
            .remove([oldPath]);
        }
      }

      setMealBase64('');
      setMealImage('');

      Alert.alert(
        editingId ? 'Listing updated' : 'Listing published'
      );

      setCurrentScreen('my-listings');
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage
          .from('food-images')
          .remove([uploadedPath]);
      }

      Alert.alert('Save failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function deleteListing(item: Listing) {
    Alert.alert(
      'Delete listing?',
      `Are you sure you want to delete ${item.title}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (
              !userId ||
              item.cook_id !== userId ||
              busy
            ) {
              return;
            }

            setBusy(true);

            try {
              const { data: activeOrders, error: orderCheckError } =
                await supabase
                  .from('orders')
                  .select('id')
                  .eq('listing_id', item.id)
                  .in('status', ['pending', 'accepted'])
                  .limit(1);

              if (orderCheckError) throw orderCheckError;

              if (activeOrders?.length) {
                throw new Error(
                  'Complete or decline active orders before deleting this listing.'
                );
              }

              const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', item.id)
                .eq('cook_id', userId)
                .select('id')
                .single();

              if (error) throw error;

              const path = item.image_url?.split(
                '/storage/v1/object/public/food-images/'
              )[1];

              if (path?.startsWith(`${userId}/`)) {
                await supabase.storage
                  .from('food-images')
                  .remove([path]);
              }

              setListings((previous) =>
                previous.filter(
                  (listing) => listing.id !== item.id
                )
              );

              Alert.alert('Listing deleted');
            } catch (error) {
              Alert.alert(
                'Delete failed',
                errorMessage(error)
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  // Order management

  async function loadOrders() {
    if (!userId) return;

    setLoadingOrders(true);
    setOrderError('');

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data ?? []);
    } catch (error) {
      setOrders([]);
      setOrderError(errorMessage(error));
    } finally {
      setLoadingOrders(false);
    }
  }

  function openOrderForm(item: Listing) {
    if (item.cook_id === userId) {
      Alert.alert('You cannot order your own meal');
      return;
    }

    if (!item.is_available || item.portions < 1) {
      Alert.alert('This meal is unavailable');
      return;
    }

    setSelectedListing(item);
    setQuantity(1);
    setCurrentScreen('place-order');
  }

  async function placeOrder() {
    if (!userId || !selectedListing || busy) return;

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > selectedListing.portions
    ) {
      Alert.alert('Invalid quantity');
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.rpc(
        'place_order',
        {
          p_listing_id: selectedListing.id,
          p_quantity: quantity,
        }
      );

      if (error) throw error;

      setSelectedListing(null);
      setQuantity(1);
      setCurrentScreen('my-orders');

      Alert.alert(
        'Order placed!',
        'Your order has been sent to the home cook. No payment has been collected.'
      );
    } catch (error) {
      Alert.alert(
        'Order failed',
        errorMessage(error)
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmOrder() {
    if (!selectedListing || busy) return;

    Alert.alert(
      'Confirm your order',
      `${quantity} portion(s) of ${selectedListing.title}\nTotal: ${money(
        selectedListing.price * quantity
      )}\n\nNo online payment will be collected.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm Order',
          onPress: () => {
            void placeOrder();
          },
        },
      ]
    );
  }

  async function updateOrderStatus(
    orderId: string,
    status: string
  ) {
    if (!userId || busy) return;

    setBusy(true);

    try {
      const { error } = await supabase.rpc(
        'update_order_status',
        {
          p_order_id: orderId,
          p_status: status,
        }
      );

      if (error) throw error;

      await loadOrders();

      Alert.alert(
        'Order updated',
        `Order status: ${status}`
      );
    } catch (error) {
      Alert.alert(
        'Update failed',
        errorMessage(error)
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmStatus(
    orderId: string,
    status: string
  ) {
    Alert.alert(
      'Update order?',
      `Change this order's status to ${status}?`,
      [
        {
          text: 'Go Back',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: () => {
            void updateOrderStatus(orderId, status);
          },
        },
      ]
    );
  }

  function statusColor(status: string) {
    switch (status) {
      case 'pending':
        return '#B45309';
      case 'accepted':
        return '#2563EB';
      case 'completed':
        return '#15803D';
      case 'declined':
      case 'cancelled':
        return '#B91C1C';
      default:
        return '#555555';
    }
  }

  function statusBackground(status: string) {
    switch (status) {
      case 'pending':
        return '#FEF3C7';
      case 'accepted':
        return '#DBEAFE';
      case 'completed':
        return '#DCFCE7';
      case 'declined':
      case 'cancelled':
        return '#FEE2E2';
      default:
        return '#EEEEEE';
    }
  }

  function backButton(
    label = 'Back to Home',
    screen = 'home'
  ) {
    return (
      <TouchableOpacity
        style={styles.backButton}
        disabled={busy}
        onPress={() => setCurrentScreen(screen)}
      >
        <Text style={styles.backButtonText}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  // Loading screen

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.homeContent}>
          <ActivityIndicator
            size="large"
            color="#2D4934"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Login and registration

  if (
    currentScreen === 'login' ||
    currentScreen === 'signup' ||
    (!session &&
      currentScreen !== 'home' &&
      currentScreen !== 'cook')
  ) {
    const signUp = currentScreen === 'signup';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
          keyboardShouldPersistTaps="handled"
        >
          {backButton()}

          <Text style={styles.title}>
            {signUp ? 'Create Account' : 'Log In'}
          </Text>

          <Text style={styles.subtitle}>
            Welcome to Home-Cooked Marketplace
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!busy}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!busy}
          />

          <Button
            label={
              busy
                ? 'Please wait...'
                : signUp
                ? 'Create Account'
                : 'Log In'
            }
            disabled={busy}
            onPress={() => authenticate(signUp)}
          />

          <Button
            secondary
            disabled={busy}
            label={
              signUp
                ? 'Already have an account? Log In'
                : 'New here? Create Account'
            }
            onPress={() =>
              setCurrentScreen(
                signUp ? 'login' : 'signup'
              )
            }
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Profile screen

  if (
    currentScreen === 'profile' ||
    currentScreen === 'edit-profile'
  ) {
    const editing =
      currentScreen === 'edit-profile';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
          keyboardShouldPersistTaps="handled"
        >
          {backButton()}

          <Text style={styles.title}>
            {editing ? 'Edit Profile' : 'My Profile'}
          </Text>

          <Text style={styles.subtitle}>
            {session?.user.email}
          </Text>

          {profileReady && (
            <View style={styles.avatarSection}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                  ]}
                >
                  <Text style={styles.avatarInitial}>
                    {(
                      fullName.trim() ||
                      session?.user.email ||
                      'U'
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              {editing && (
                <TouchableOpacity
                  disabled={busy}
                  onPress={chooseProfilePicture}
                >
                  <Text style={styles.avatarButton}>
                    {avatarUrl
                      ? 'Change Profile Picture'
                      : 'Add Profile Picture'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!profileReady ? (
            <Text style={styles.noticeText}>
              Profile not loaded. If loading failed,
              log out and try again.
            </Text>
          ) : editing ? (
            <View style={styles.card}>
              <Text style={styles.detailLabel}>
                Full Name
              </Text>

              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                editable={!busy}
              />

              <Text style={styles.detailLabel}>
                Bio
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                multiline
                editable={!busy}
              />

              <Text style={styles.detailLabel}>
                Location
              </Text>

              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City"
                editable={!busy}
              />

              <View style={styles.switchRow}>
                <Text style={styles.detailLabel}>
                  I am a home cook
                </Text>

                <Switch
                  value={isCook}
                  onValueChange={setIsCook}
                  disabled={busy}
                />
              </View>

              <View style={{ marginTop: 20 }}>
                <Button
                  label={
                    busy
                      ? 'Saving...'
                      : 'Save Profile'
                  }
                  disabled={busy}
                  onPress={saveProfile}
                />
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {fullName || 'Your Profile'}
              </Text>

              <Field
                label="Bio"
                value={bio || 'Not added yet'}
              />

              <Field
                label="Location"
                value={location || 'Not added yet'}
              />

              <Field
                label="Account Type"
                value={
                  isCook ? 'Home Cook' : 'Customer'
                }
              />

              <Button
                label="Edit Profile"
                onPress={() =>
                  setCurrentScreen('edit-profile')
                }
              />

              <Button
                secondary
                label="My Orders"
                onPress={() =>
                  setCurrentScreen('my-orders')
                }
              />

              <Button
                secondary
                label="Incoming Orders"
                onPress={() =>
                  setCurrentScreen('incoming-orders')
                }
              />

              {isCook && (
                <Button
                  secondary
                  label="My Listings"
                  onPress={() =>
                    setCurrentScreen('my-listings')
                  }
                />
              )}
            </View>
          )}

          <Button
            secondary
            label="Log Out"
            disabled={busy}
            onPress={logout}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Create and edit food listings

  if (currentScreen === 'listing-form') {
    if (!profileReady || !isCook) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.homeContent}>
            <Text style={styles.title}>
              Home Cook Account Required
            </Text>

            <Text style={styles.subtitle}>
              Enable the home cook option in your profile.
            </Text>

            <Button
              label="Edit Profile"
              onPress={() =>
                setCurrentScreen('edit-profile')
              }
            />

            <Button
              secondary
              label="Back to Home"
              onPress={() =>
                setCurrentScreen('home')
              }
            />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
          keyboardShouldPersistTaps="handled"
        >
          {backButton(
            'Back to My Listings',
            'my-listings'
          )}

          <Text style={styles.title}>
            {editingId
              ? 'Edit Food Listing'
              : 'Create Food Listing'}
          </Text>

          <Text style={styles.subtitle}>
            Share your delicious homemade meals
            with your community.
          </Text>

          <View style={styles.card}>
            {mealImage ? (
              <Image
                source={{ uri: mealImage }}
                style={styles.foodImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderEmoji}>
                  🍽️
                </Text>

                <Text style={styles.noticeText}>
                  Add a photo of your meal
                </Text>
              </View>
            )}

            <Button
              secondary
              disabled={busy}
              label={
                mealImage
                  ? 'Change Food Picture'
                  : 'Add Food Picture'
              }
              onPress={chooseMealImage}
            />

            <Text style={styles.detailLabel}>
              Meal Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Homemade Chicken and Rice"
              value={mealTitle}
              onChangeText={setMealTitle}
              editable={!busy}
            />

            <Text style={styles.detailLabel}>
              Description
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
              ]}
              placeholder="Describe your homemade meal..."
              value={mealDescription}
              onChangeText={setMealDescription}
              multiline
              editable={!busy}
            />

            <Text style={styles.detailLabel}>
              Price per Portion ($)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="12.99"
              value={mealPrice}
              onChangeText={setMealPrice}
              keyboardType="decimal-pad"
              editable={!busy}
            />

            <Text style={styles.detailLabel}>
              Available Portions
            </Text>

            <TextInput
              style={styles.input}
              placeholder="5"
              value={mealPortions}
              onChangeText={setMealPortions}
              keyboardType="number-pad"
              editable={!busy}
            />

            <Text style={styles.detailLabel}>
              Location
            </Text>

            <TextInput
              style={styles.input}
              placeholder="City"
              value={mealLocation}
              onChangeText={setMealLocation}
              editable={!busy}
            />

            <View style={styles.switchRow}>
              <Text style={styles.detailLabel}>
                Available for Customers
              </Text>

              <Switch
                value={available}
                onValueChange={setAvailable}
                disabled={busy}
              />
            </View>

            <View style={{ marginTop: 20 }}>
              <Button
                label={
                  busy
                    ? 'Saving...'
                    : editingId
                    ? 'Save Changes'
                    : 'Publish Listing'
                }
                disabled={busy}
                onPress={saveListing}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Explore meals and manage listings

  if (
    currentScreen === 'meals' ||
    currentScreen === 'my-listings'
  ) {
    const own =
      currentScreen === 'my-listings';

    const visible = listings.filter((item) =>
      own
        ? item.cook_id === userId
        : item.is_available && item.portions > 0
    );

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
        >
          {backButton()}

          <Text style={styles.title}>
            {own
              ? 'My Listings'
              : 'Explore Homemade Meals'}
          </Text>

          <Text style={styles.subtitle}>
            {own
              ? 'Create and manage your homemade food listings.'
              : 'Discover delicious meals prepared by home cooks in your community.'}
          </Text>

          {own && isCook && profileReady && (
            <Button
              label="+ Create Food Listing"
              disabled={busy}
              onPress={() => openListingForm()}
            />
          )}

          <TouchableOpacity
            style={styles.backButton}
            disabled={loadingListings || busy}
            onPress={loadListings}
          >
            <Text style={styles.backButtonText}>
              Refresh Listings
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            {own ? 'Your Meals' : 'Available Meals'}
          </Text>

          {loadingListings ? (
            <ActivityIndicator
              size="large"
              color="#2D4934"
            />
          ) : listingError ? (
            <Text style={styles.noticeText}>
              {listingError}
            </Text>
          ) : visible.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                No Meals Yet
              </Text>

              <Text style={styles.cardText}>
                {own
                  ? 'Create your first food listing to get started.'
                  : 'Check back soon for delicious homemade meals.'}
              </Text>
            </View>
          ) : (
            visible.map((item) => (
              <View
                key={item.id}
                style={styles.mealCard}
              >
                {item.image_url ? (
                  <Image
                    source={{
                      uri: item.image_url,
                    }}
                    style={styles.foodImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text
                      style={styles.placeholderEmoji}
                    >
                      🍽️
                    </Text>
                  </View>
                )}

                <View style={styles.mealHeader}>
                  <Text style={styles.mealName}>
                    {item.title}
                  </Text>

                  <Text style={styles.mealPrice}>
                    {money(item.price)}
                  </Text>
                </View>

                <Text style={styles.mealLocation}>
                  {item.location}
                </Text>

                <Text style={styles.mealDescription}>
                  {item.description}
                </Text>

                <Text style={styles.mealLocation}>
                  {item.portions} portions available
                </Text>

                {own && (
                  <Text
                    style={[
                      styles.availabilityText,
                      {
                        color:
                          item.is_available &&
                          item.portions > 0
                            ? '#15803D'
                            : '#B45309',
                      },
                    ]}
                  >
                    {item.is_available &&
                    item.portions > 0
                      ? 'Available'
                      : 'Unavailable'}
                  </Text>
                )}

                <Button
                  label="View Details"
                  disabled={busy}
                  onPress={() => {
                    setDetailsBack(currentScreen);
                    setCurrentScreen(
                      `meal-${item.id}`
                    );
                  }}
                />

                {!own &&
                  item.cook_id !== userId && (
                    <Button
                      secondary
                      label="Order Now"
                      disabled={busy}
                      onPress={() =>
                        openOrderForm(item)
                      }
                    />
                  )}

                {own && (
                  <>
                    {isCook && (
                      <Button
                        secondary
                        label="Edit Listing"
                        disabled={busy}
                        onPress={() =>
                          openListingForm(item)
                        }
                      />
                    )}

                    <Button
                      danger
                      label="Delete Listing"
                      disabled={busy}
                      onPress={() =>
                        deleteListing(item)
                      }
                    />
                  </>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Individual meal details

  if (currentScreen.startsWith('meal-')) {
    const mealId = currentScreen.slice(5);

    const item = listings.find(
      (listing) => listing.id === mealId
    );

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
        >
          {backButton(
            detailsBack === 'my-listings'
              ? 'Back to My Listings'
              : 'Back to Meals',
            detailsBack
          )}

          {item ? (
            <>
              <Text style={styles.title}>
                {item.title}
              </Text>

              {item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.detailsFoodImage}
                />
              )}

              <View style={styles.card}>
                <Field
                  label="Price per Portion"
                  value={money(item.price)}
                />

                <Field
                  label="Description"
                  value={item.description}
                />

                <Field
                  label="Available Portions"
                  value={String(item.portions)}
                />

                <Field
                  label="Location"
                  value={item.location}
                />

                <Field
                  label="Availability"
                  value={
                    item.is_available &&
                    item.portions > 0
                      ? 'Available'
                      : 'Unavailable'
                  }
                />

                {item.cook_id !== userId &&
                item.is_available &&
                item.portions > 0 ? (
                  <Button
                    label="Place Order"
                    onPress={() =>
                      openOrderForm(item)
                    }
                  />
                ) : item.cook_id === userId ? (
                  <Text style={styles.noticeText}>
                    This is your own food listing.
                  </Text>
                ) : (
                  <Text style={styles.noticeText}>
                    This meal is currently unavailable.
                  </Text>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.noticeText}>
              This listing is unavailable.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Place an order

  if (currentScreen === 'place-order') {
    const item = selectedListing;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
        >
          {backButton('Back to Meals', 'meals')}

          <Text style={styles.title}>
            Place Your Order
          </Text>

          <Text style={styles.subtitle}>
            Review your meal and select the number
            of portions you would like.
          </Text>

          {item ? (
            <View style={styles.card}>
              {item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.foodImage}
                />
              )}

              <Text style={styles.cardTitle}>
                {item.title}
              </Text>

              <Field
                label="Price per Portion"
                value={money(item.price)}
              />

              <Field
                label="Location"
                value={item.location}
              />

              <Field
                label="Available Portions"
                value={String(item.portions)}
              />

              <Text style={styles.detailLabel}>
                Quantity
              </Text>

              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    (quantity <= 1 || busy) && {
                      opacity: 0.4,
                    },
                  ]}
                  disabled={quantity <= 1 || busy}
                  onPress={() =>
                    setQuantity((previous) =>
                      Math.max(1, previous - 1)
                    )
                  }
                >
                  <Text
                    style={styles.quantityButtonText}
                  >
                    −
                  </Text>
                </TouchableOpacity>

                <Text style={styles.quantityNumber}>
                  {quantity}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    (quantity >= item.portions ||
                      busy) && {
                      opacity: 0.4,
                    },
                  ]}
                  disabled={
                    quantity >= item.portions ||
                    busy
                  }
                  onPress={() =>
                    setQuantity((previous) =>
                      Math.min(
                        item.portions,
                        previous + 1
                      )
                    )
                  }
                >
                  <Text
                    style={styles.quantityButtonText}
                  >
                    +
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>
                  Order Total
                </Text>

                <Text style={styles.totalPrice}>
                  {money(item.price * quantity)}
                </Text>
              </View>

              <Text style={styles.paymentNotice}>
                Your order will be sent to the home cook.
                Online payment is not required or collected
                through this app.
              </Text>

              <Button
                label={
                  busy
                    ? 'Placing Order...'
                    : 'Confirm Order'
                }
                disabled={busy}
                onPress={confirmOrder}
              />
            </View>
          ) : (
            <Text style={styles.noticeText}>
              No meal selected.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Customer orders and incoming cook orders

  if (
    currentScreen === 'my-orders' ||
    currentScreen === 'incoming-orders'
  ) {
    const incoming =
      currentScreen === 'incoming-orders';

    const visibleOrders = orders.filter(
      (order) =>
        incoming
          ? order.cook_id === userId
          : order.customer_id === userId
    );

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
        >
          {backButton()}

          <Text style={styles.title}>
            {incoming
              ? 'Incoming Orders'
              : 'My Orders'}
          </Text>

          <Text style={styles.subtitle}>
            {incoming
              ? 'Manage orders placed by your customers.'
              : 'Track your orders and their current status.'}
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            disabled={loadingOrders || busy}
            onPress={loadOrders}
          >
            <Text style={styles.backButtonText}>
              Refresh Orders
            </Text>
          </TouchableOpacity>

          {loadingOrders ? (
            <ActivityIndicator
              size="large"
              color="#2D4934"
            />
          ) : orderError ? (
            <Text style={styles.noticeText}>
              {orderError}
            </Text>
          ) : visibleOrders.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                No Orders Yet
              </Text>

              <Text style={styles.cardText}>
                {incoming
                  ? 'Customer orders will appear here.'
                  : 'Explore homemade meals and place your first order.'}
              </Text>

              {!incoming && (
                <View style={{ marginTop: 20 }}>
                  <Button
                    label="Explore Meals"
                    onPress={() =>
                      setCurrentScreen('meals')
                    }
                  />
                </View>
              )}
            </View>
          ) : (
            visibleOrders.map((order) => (
              <View
                key={order.id}
                style={styles.mealCard}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.mealName}>
                    {order.meal_title}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          statusBackground(order.status),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: statusColor(
                            order.status
                          ),
                        },
                      ]}
                    >
                      {order.status
                        .charAt(0)
                        .toUpperCase() +
                        order.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.orderDate}>
                  Order #{order.id.slice(0, 8)}
                </Text>

                <Text style={styles.orderDate}>
                  {new Date(
                    order.created_at
                  ).toLocaleString()}
                </Text>

                <View style={styles.divider} />

                <Field
                  label="Quantity"
                  value={`${order.quantity} portion(s)`}
                />

                <Field
                  label="Price per Portion"
                  value={money(order.unit_price)}
                />

                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>
                    Total
                  </Text>

                  <Text style={styles.totalPrice}>
                    {money(order.total_price)}
                  </Text>
                </View>

                {incoming &&
                  order.status === 'pending' && (
                    <>
                      <Button
                        label="Accept Order"
                        disabled={busy}
                        onPress={() =>
                          confirmStatus(
                            order.id,
                            'accepted'
                          )
                        }
                      />

                      <Button
                        danger
                        label="Decline Order"
                        disabled={busy}
                        onPress={() =>
                          confirmStatus(
                            order.id,
                            'declined'
                          )
                        }
                      />
                    </>
                  )}

                {incoming &&
                  order.status === 'accepted' && (
                    <Button
                      label="Mark as Completed"
                      disabled={busy}
                      onPress={() =>
                        confirmStatus(
                          order.id,
                          'completed'
                        )
                      }
                    />
                  )}

                {!incoming &&
                  order.status === 'pending' && (
                    <>
                      <Text style={styles.paymentNotice}>
                        Waiting for the home cook to
                        accept your order.
                      </Text>

                      <Button
                        danger
                        label="Cancel Order"
                        disabled={busy}
                        onPress={() =>
                          confirmStatus(
                            order.id,
                            'cancelled'
                          )
                        }
                      />
                    </>
                  )}

                {!incoming &&
                  order.status === 'accepted' && (
                    <Text style={styles.successNotice}>
                      Your order has been accepted!
                    </Text>
                  )}

                {order.status === 'completed' && (
                  <Text style={styles.successNotice}>
                    Order successfully completed.
                  </Text>
                )}

                {order.status === 'declined' && (
                  <Text style={styles.noticeText}>
                    This order was declined by the cook.
                  </Text>
                )}

                {order.status === 'cancelled' && (
                  <Text style={styles.noticeText}>
                    This order has been cancelled.
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Become a home cook

  if (currentScreen === 'cook') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <View style={styles.homeContent}>
          <Text style={styles.title}>
            Become a Home Cook
          </Text>

          <Text style={styles.subtitle}>
            Share your homemade meals with people
            in your community and earn additional income.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Start Selling Your Meals
            </Text>

            <Text style={styles.cardText}>
              Create your home cook profile, publish
              homemade dishes, upload food pictures,
              and receive customer orders.
            </Text>
          </View>

          <Button
            label={
              !session
                ? 'Log In / Create Account'
                : profileReady && isCook
                ? 'My Listings'
                : 'Set Up Cook Profile'
            }
            onPress={() =>
              setCurrentScreen(
                !session
                  ? 'login'
                  : profileReady && isCook
                  ? 'my-listings'
                  : 'edit-profile'
              )
            }
          />

          <Button
            secondary
            label="Back to Home"
            onPress={() =>
              setCurrentScreen('home')
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  // Home screen

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.homeScrollContent}
      >
        <Text style={styles.homeEmoji}>🍽️</Text>

        <Text style={styles.title}>
          Home-Cooked Marketplace
        </Text>

        <Text style={styles.subtitle}>
          Discover delicious homemade meals from
          local home cooks.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {session && fullName
              ? `Welcome, ${fullName}!`
              : 'Welcome!'}
          </Text>

          <Text style={styles.cardText}>
            Find homemade meals or share your cooking
            with your community.
          </Text>
        </View>

        <Button
          label="Explore Meals"
          onPress={() =>
            setCurrentScreen(
              session ? 'meals' : 'login'
            )
          }
        />

        <Button
          label={
            session
              ? 'My Profile'
              : 'Log In / Create Account'
          }
          onPress={() =>
            setCurrentScreen(
              session ? 'profile' : 'login'
            )
          }
        />

        {session && (
          <Button
            label="My Orders"
            onPress={() =>
              setCurrentScreen('my-orders')
            }
          />
        )}

        {session && profileReady && isCook ? (
          <>
            <Button
              secondary
              label="My Listings"
              onPress={() =>
                setCurrentScreen('my-listings')
              }
            />

            <Button
              secondary
              label="Incoming Orders"
              onPress={() =>
                setCurrentScreen('incoming-orders')
              }
            />
          </>
        ) : (
          <Button
            secondary
            label="Become a Home Cook"
            onPress={() =>
              setCurrentScreen('cook')
            }
          />
        )}
      </ScrollView>
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

  homeScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },

  homeEmoji: {
    fontSize: 52,
    textAlign: 'center',
    marginBottom: 18,
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
    marginBottom: 24,
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
    justifyContent: 'center',
    marginBottom: 12,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#2D4934',
    borderWidth: 2,
  },

  secondaryButtonText: {
    color: '#2D4934',
  },

  dangerButton: {
    backgroundColor: 'transparent',
    borderColor: '#B91C1C',
    borderWidth: 1,
  },

  dangerButtonText: {
    color: '#B91C1C',
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
    fontSize: 19,
    fontWeight: 'bold',
    color: '#2D4934',
    flex: 1,
    marginRight: 12,
  },

  mealPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D4934',
  },

  mealLocation: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 12,
  },

  mealDescription: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 23,
    marginBottom: 12,
  },

  detailLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D4934',
    marginBottom: 8,
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
    lineHeight: 22,
  },

  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3EAE3',
  },

  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitial: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#2D4934',
  },

  avatarButton: {
    marginTop: 14,
    color: '#2D4934',
    fontSize: 16,
    fontWeight: 'bold',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DDD5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2D4934',
    marginBottom: 16,
  },

  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },

  foodImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#E3EAE3',
  },

  detailsFoodImage: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: '#E3EAE3',
  },

  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#E3EAE3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  availabilityText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },

  quantityButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2D4934',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },

  quantityNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D4934',
    minWidth: 80,
    textAlign: 'center',
  },

  totalBox: {
    backgroundColor: '#EAF0E8',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D4934',
  },

  totalPrice: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#2D4934',
  },

  paymentNotice: {
    color: '#777777',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },

  successNotice: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  orderDate: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 6,
  },

  statusBadge: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 16,
  },
});