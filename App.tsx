import { useState, useEffect } from 'react';
import {
  StyleSheet, Image, TextInput, Alert, Switch,
  ActivityIndicator, Text, View, TouchableOpacity,
  ScrollView, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './utils/supabase';

// BRAND

const C = {
  green: '#183D2B',
  greenLight: '#E6EFE7',
  cream: '#F9F5ED',
  orange: '#E9A35B',
  white: '#FFFFFF',
  ink: '#202C24',
  muted: '#737D74',
  border: '#E4E6DF',
  red: '#B42318',
};

const RECOVERY_URL =
  'https://operatedocean.github.io/home-cooked-marketplace/';

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
  accent?: boolean;
};

function money(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String((error as { message?: string })?.message ?? error);
}

function Button({
  label, onPress, secondary, danger, disabled, accent,
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.buttonSecondary,
        danger && s.buttonDanger,
        accent && s.buttonAccent,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[
        s.buttonText,
        secondary && { color: C.green },
        danger && { color: C.red },
        accent && { color: C.green },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Input({
  label, ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={s.inputGroup}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput
        placeholderTextColor="#929B91"
        {...props}
        style={[
          s.input,
          props.multiline && s.multiline,
          props.style,
        ]}
      />
    </View>
  );
}

function Heading({
  eyebrow, title, subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={s.heading}>
      {!!eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
      <Text style={s.title}>{title}</Text>
      {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

function Brand() {
  return (
    <View style={s.brandRow}>
      <View style={s.logo}>
        <Text style={s.logoText}>hc.</Text>
      </View>
      <View>
        <Text style={s.brandName}>homecooked.</Text>
        <Text style={s.brandTag}>GOOD FOOD. REAL PEOPLE.</Text>
      </View>
    </View>
  );
}

function Field({
  label, value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  );
}

function Empty({
  emoji, title, description, action, onPress,
}: {
  emoji: string;
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyEmoji}>{emoji}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyDescription}>{description}</Text>
      {!!action && !!onPress && (
        <Button label={action} onPress={onPress} />
      )}
    </View>
  );
}

function FoodImage({
  uri, large = false,
}: {
  uri: string | null;
  large?: boolean;
}) {
  return uri ? (
    <Image
      source={{ uri }}
      resizeMode="cover"
      style={[s.foodImage, large && { height: 280 }]}
    />
  ) : (
    <View style={[
      s.foodPlaceholder,
      large && { height: 280 },
    ]}>
      <Text style={{ fontSize: 54 }}>🍲</Text>
      <Text style={s.placeholderText}>Made with love</Text>
    </View>
  );
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    pending: ['#FFF1D6', '#9A620D'],
    accepted: ['#E4EDFF', '#2859A8'],
    completed: ['#E0F1E4', '#23733D'],
    declined: ['#FDE7E5', '#B42318'],
    cancelled: ['#FDE7E5', '#B42318'],
    available: ['#E0F1E4', '#23733D'],
    unavailable: ['#F0EDE7', '#746A5E'],
  };

  const [backgroundColor, color] =
    colors[status] ?? ['#EEEEEE', '#555555'];

  return (
    <View style={[s.badge, { backgroundColor }]}>
      <View style={[s.badgeDot, { backgroundColor: color }]} />
      <Text style={[s.badgeText, { color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

function MenuRow({
  emoji, title, subtitle, onPress, danger,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={s.menuRow}
      onPress={onPress}
    >
      <View style={s.menuIcon}>
        <Text style={{ fontSize: 21 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[
          s.menuTitle,
          danger && { color: C.red },
        ]}>{title}</Text>
        {!!subtitle && (
          <Text style={s.smallMuted}>{subtitle}</Text>
        )}
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// APPLICATION

export default function App() {
  const [screen, setScreen] = useState('home');
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // Authentication

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [isCook, setIsCook] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileReady, setProfileReady] = useState(false);

  // Listings

  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingError, setListingError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mealTitle, setMealTitle] = useState('');
  const [mealDescription, setMealDescription] = useState('');
  const [mealPrice, setMealPrice] = useState('');
  const [mealPortions, setMealPortions] = useState('');
  const [mealLocation, setMealLocation] = useState('');
  const [mealImage, setMealImage] = useState('');
  const [mealBase64, setMealBase64] = useState('');
  const [available, setAvailable] = useState(true);
  const [detailsBack, setDetailsBack] = useState('meals');

  // Discovery

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All meals');

  // Orders

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderFilter, setOrderFilter] = useState('All');
  const [quantity, setQuantity] = useState(1);
  const [selectedListing, setSelectedListing] =
    useState<Listing | null>(null);

  const userId = session?.user.id;

  const availableMeals = listings.filter(
    item => item.is_available && item.portions > 0
  );

  const ownListings = listings.filter(
    item => item.cook_id === userId
  );

  // AUTHENTICATION LISTENER

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

  // LOAD PROFILE

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
    clearPasswordFields();

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

    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    if (['home', 'meals', 'my-listings'].includes(screen)) {
      void loadListings();
    }

    if (['my-orders', 'incoming-orders'].includes(screen)) {
      void loadOrders();
    }
  }, [screen, userId]);

  // NAVIGATION

  function navigate(destination: string) {
    if (busy) return;

    clearPasswordFields();
    setShowPassword(false);

    if (
      !session &&
      !['home', 'login', 'signup', 'forgot-password', 'cook']
        .includes(destination)
    ) {
      setScreen('login');
      return;
    }

    if (
      destination === 'my-orders' ||
      destination === 'incoming-orders'
    ) {
      setOrderFilter('All');
    }

    setScreen(destination);
  }

  // LOGIN AND REGISTRATION

  async function authenticate(signUp: boolean) {
    if (busy) return;

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
        : await supabase.auth.signInWithPassword(credentials);

      if (error) throw error;

      setPassword('');
      setShowPassword(false);

      if (signUp && !data.session) {
        Alert.alert(
          'Check your email',
          'Confirm your email address before logging in.'
        );
        setScreen('login');
      } else {
        setScreen('home');
      }
    } catch (error) {
      Alert.alert('Authentication error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // PASSWORD RECOVERY

  async function resetPassword() {
    if (busy) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Enter a valid email address');
      return;
    }

    setBusy(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: RECOVERY_URL }
        );

      if (error) throw error;

      setPassword('');
      setScreen('login');

      Alert.alert(
        'Check your email',
        'If an account exists with this email address, you will receive a password reset link.'
      );
    } catch (error) {
      Alert.alert('Password reset failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearPasswordFields() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function changePassword() {
    if (busy || !session?.user.email) return;

    if (!currentPassword) {
      Alert.alert('Enter your current password');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        'Password too short',
        'Your new password must contain at least 8 characters.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Choose a different password');
      return;
    }

    setBusy(true);

    try {
      const { data, error: verificationError } =
        await supabase.auth.signInWithPassword({
          email: session.user.email,
          password: currentPassword,
        });

      if (verificationError) throw verificationError;

      if (data.user?.id !== session.user.id) {
        throw new Error('Account verification failed.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      clearPasswordFields();
      setScreen('profile');

      Alert.alert(
        'Password changed!',
        'Your password has been successfully updated.'
      );
    } catch (error) {
      Alert.alert('Password change failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // LOGOUT

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
      setSearch('');
      setFilter('All meals');
      clearPasswordFields();
      setScreen('home');
    } catch (error) {
      Alert.alert('Logout failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // PROFILE MANAGEMENT

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

      setScreen('profile');
      Alert.alert('Profile saved');
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
      const result = await ImagePicker.launchImageLibraryAsync({
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
        throw new Error('Choose an image smaller than 5 MB.');
      }

      const path = `${userId}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
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
        await supabase.storage.from('avatars').remove([path]);
        throw profileError;
      }

      const oldPath = avatarUrl.split(
        '/storage/v1/object/public/avatars/'
      )[1];

      setAvatarUrl(data.publicUrl);

      if (oldPath?.startsWith(`${userId}/`)) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      Alert.alert('Profile picture saved');
    } catch (error) {
      Alert.alert('Picture upload failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  // FOOD LISTINGS

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
    if (busy) return;

    setEditingId(item?.id ?? null);
    setMealTitle(item?.title ?? '');
    setMealDescription(item?.description ?? '');
    setMealPrice(item ? String(item.price) : '');
    setMealPortions(item ? String(item.portions) : '');
    setMealLocation(item?.location ?? location);
    setMealImage(item?.image_url ?? '');
    setMealBase64('');
    setAvailable(item?.is_available ?? true);
    setScreen('listing-form');
  }

  async function chooseMealImage() {
    if (busy) return;

    setBusy(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
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

      if (decode(asset.base64).byteLength > 5 * 1024 * 1024) {
        throw new Error('Choose an image smaller than 5 MB.');
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
    if (!userId || !profileReady || !isCook || busy) return;

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
        item => item.id === editingId
      );

      if (mealBase64) {
        const path = `${userId}/meal-${Date.now()}.jpg`;

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
        : supabase.from('listings').insert(values);

      const { error } = await query.select('id').single();

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
      setScreen('my-listings');

      Alert.alert(
        editingId ? 'Listing updated' : 'Listing published'
      );
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
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!userId || item.cook_id !== userId || busy) return;

            setBusy(true);

            try {
              const {
                data: activeOrders,
                error: orderCheckError,
              } = await supabase
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

              setListings(previous =>
                previous.filter(listing => listing.id !== item.id)
              );

              Alert.alert('Listing deleted');
            } catch (error) {
              Alert.alert('Delete failed', errorMessage(error));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  // ORDER MANAGEMENT

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
    if (busy) return;

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
    setScreen('place-order');
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
      const { error } = await supabase.rpc('place_order', {
        p_listing_id: selectedListing.id,
        p_quantity: quantity,
      });

      if (error) throw error;

      setSelectedListing(null);
      setQuantity(1);
      setOrderFilter('All');
      setScreen('my-orders');

      Alert.alert(
        'Order placed!',
        'Your order has been sent to the home cook. No payment has been collected.'
      );
    } catch (error) {
      Alert.alert('Order failed', errorMessage(error));
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
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Order',
          onPress: () => { void placeOrder(); },
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

      Alert.alert('Order updated', `Order status: ${status}`);
    } catch (error) {
      Alert.alert('Update failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function confirmStatus(orderId: string, status: string) {
    Alert.alert(
      'Update order?',
      `Change this order's status to ${status}?`,
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            void updateOrderStatus(orderId, status);
          },
        },
      ]
    );
  }

  // SHARED UI

  function back(destination = 'home', label = 'Back') {
    return (
      <TouchableOpacity
        disabled={busy}
        style={s.back}
        onPress={() => navigate(destination)}
      >
        <Text style={s.backArrow}>‹</Text>
        <Text style={s.backText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function avatar(size = 84) {
    return avatarUrl ? (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: C.greenLight,
        }}
      />
    ) : (
      <View style={[
        s.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}>
        <Text style={{
          color: C.green,
          fontSize: size * 0.38,
          fontWeight: '800',
        }}>
          {(fullName || session?.user.email || 'U')
            .charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  function bottomNav() {
    const tabs = [
      { id: 'home', icon: '⌂', label: 'Home' },
      { id: 'meals', icon: '⌕', label: 'Explore' },
      { id: 'my-orders', icon: '▤', label: 'Orders' },
      { id: 'profile', icon: '◎', label: 'Profile' },
    ];

    return (
      <View style={s.bottomNav}>
        {tabs.map(tab => {
          const active =
            screen === tab.id ||
            (tab.id === 'meals' && screen.startsWith('meal-')) ||
            (tab.id === 'my-orders' && screen === 'incoming-orders');

          return (
            <TouchableOpacity
              key={tab.id}
              disabled={busy}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => navigate(tab.id)}
              style={s.tab}
            >
              <View style={[
                s.tabIconBox,
                active && s.tabIconActive,
              ]}>
                <Text style={[
                  s.tabIcon,
                  active && { color: C.green },
                ]}>{tab.icon}</Text>
              </View>
              <Text style={[
                s.tabLabel,
                active && s.tabLabelActive,
              ]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function page(content: ReactNode, tabs = false) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            key={screen}
            style={{ flex: 1 }}
            contentContainerStyle={s.page}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
          {tabs && bottomNav()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  function section(
    title: string,
    action?: string,
    onPress?: () => void
  ) {
    return (
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>{title}</Text>
        {!!action && !!onPress && (
          <TouchableOpacity onPress={onPress}>
            <Text style={s.link}>{action} ›</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function chips(
    values: string[],
    selected: string,
    onSelect: (value: string) => void
  ) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {values.map(value => (
          <TouchableOpacity
            key={value}
            onPress={() => onSelect(value)}
            style={[
              s.chip,
              selected === value && s.chipActive,
            ]}
          >
            <Text style={[
              s.chipText,
              selected === value && s.chipTextActive,
            ]}>{value}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  function viewMeal(item: Listing) {
    setDetailsBack(screen);
    setScreen(`meal-${item.id}`);
  }

  function mealCard(item: Listing, own = false) {
    return (
      <View key={item.id} style={s.mealCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => viewMeal(item)}
        >
          <View>
            <FoodImage uri={item.image_url} />
            <View style={s.priceOverlay}>
              <Text style={s.priceOverlayText}>
                {money(item.price)}
              </Text>
            </View>
          </View>

          <View style={s.mealBody}>
            <Text style={s.mealTitle}>{item.title}</Text>
            <Text style={s.smallMuted}>⌖ {item.location}</Text>

            <Text
              style={s.mealDescription}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            <View style={s.mealMeta}>
              <Text style={s.portionText}>
                {item.portions} portions available
              </Text>
              {own ? (
                <Badge status={
                  item.is_available && item.portions > 0
                    ? 'available'
                    : 'unavailable'
                } />
              ) : (
                <Text style={s.mealArrow}>↗</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {own && (
          <View style={s.mealActions}>
            {isCook && (
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  disabled={busy}
                  label="Edit listing"
                  onPress={() => openListingForm(item)}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button
                danger
                disabled={busy}
                label="Delete"
                onPress={() => deleteListing(item)}
              />
            </View>
          </View>
        )}

        {!own && item.cook_id !== userId && (
          <View style={s.mealActionSingle}>
            <Button
              label="Order now"
              disabled={busy}
              onPress={() => openOrderForm(item)}
            />
          </View>
        )}
      </View>
    );
  }

  function loading() {
    return (
      <View style={{ padding: 36 }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  // INITIAL LOADING

  if (!ready) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar style="dark" />
        <View style={s.splash}>
          <View style={s.splashLogo}>
            <Text style={s.splashLogoText}>hc.</Text>
          </View>
          <Text style={s.splashTitle}>homecooked.</Text>
          <Text style={s.smallMuted}>
            Good food brings us together.
          </Text>
          <ActivityIndicator
            color={C.green}
            style={{ marginTop: 28 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // FORGOT PASSWORD

  if (screen === 'forgot-password') {
    return page(
      <>
        {back('login', 'Log in')}
        <Brand />

        <View style={s.authIllustration}>
          <Text style={{ fontSize: 52 }}>🔑</Text>
        </View>

        <Heading
          eyebrow="ACCOUNT RECOVERY"
          title="Forgot your password?"
          subtitle="It happens! Enter your email and we'll send you a secure reset link."
        />

        <View style={s.card}>
          <Input
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          <Button
            label={busy ? 'Sending...' : 'Send reset link'}
            disabled={busy}
            onPress={resetPassword}
          />
        </View>

        <Text style={s.centerMuted}>
          Check your inbox and spam folder after requesting a link.
        </Text>
      </>
    );
  }

  // CHANGE PASSWORD

  if (screen === 'change-password' && session) {
    return page(
      <>
        {back('profile', 'My profile')}

        <Heading
          eyebrow="ACCOUNT SECURITY"
          title="Change password"
          subtitle="Keep your Homecooked account protected."
        />

        <View style={s.card}>
          <Input
            label="Current password"
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          <View style={s.divider} />

          <Input
            label="New password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          <Input
            label="Confirm new password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          <View style={s.infoBox}>
            <Text style={s.infoText}>
              Use at least 8 characters and choose a password
              you haven't used elsewhere.
            </Text>
          </View>

          <Button
            label={busy ? 'Updating...' : 'Update password'}
            disabled={busy}
            onPress={changePassword}
          />

          <Button
            secondary
            label="Cancel"
            disabled={busy}
            onPress={() => navigate('profile')}
          />
        </View>
      </>
    );
  }

  // LOGIN AND SIGNUP

  if (
    screen === 'login' ||
    screen === 'signup' ||
    (!session && !['home', 'cook'].includes(screen))
  ) {
    const signUp = screen === 'signup';

    return page(
      <>
        {back()}
        <Brand />

        <View style={s.authHero}>
          <Text style={s.authHeroEmoji}>🥘</Text>
          <Text style={s.authHeroTitle}>
            A little taste of home.
          </Text>
          <Text style={s.authHeroText}>
            Homemade meals. Meaningful connections.
          </Text>
        </View>

        <Heading
          eyebrow={signUp ? 'JOIN OUR COMMUNITY' : 'WELCOME BACK'}
          title={signUp ? 'Create your account' : 'Good to see you.'}
          subtitle={
            signUp
              ? 'Discover a better way to enjoy homemade food.'
              : 'Log in to find your next favorite meal.'
          }
        />

        <View style={s.card}>
          <Input
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          <View style={s.sectionRow}>
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={s.link}>
                {showPassword ? 'Hide password' : 'Show password'}
              </Text>
            </TouchableOpacity>

            {!signUp && (
              <TouchableOpacity
                disabled={busy}
                onPress={() => {
                  setPassword('');
                  navigate('forgot-password');
                }}
              >
                <Text style={s.link}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            label={
              busy
                ? 'Please wait...'
                : signUp
                ? 'Create account'
                : 'Log in'
            }
            disabled={busy}
            onPress={() => authenticate(signUp)}
          />
        </View>

        <Text style={s.centerMuted}>
          {signUp
            ? 'Already part of the community?'
            : 'New to Homecooked?'}
        </Text>

        <Button
          secondary
          disabled={busy}
          label={signUp ? 'Log in' : 'Create an account'}
          onPress={() => {
            setPassword('');
            navigate(signUp ? 'login' : 'signup');
          }}
        />
      </>
    );
  }

  // PROFILE

  if (screen === 'profile') {
    return page(
      <>
        <Heading
          eyebrow="YOUR ACCOUNT"
          title="My profile"
          subtitle="Make Homecooked your own."
        />

        {!profileReady ? (
          <View style={s.card}>
            <Text style={s.smallMuted}>
              Profile not loaded. If loading failed, log out and try again.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.profileHero}>
              {avatar(90)}

              <Text style={s.profileName}>
                {fullName || 'Your profile'}
              </Text>

              <Text style={s.profileEmail}>
                {session?.user.email}
              </Text>

              <View style={s.profileRole}>
                <Text style={s.profileRoleText}>
                  {isCook ? '👨‍🍳 Home cook' : 'Food lover'}
                </Text>
              </View>
            </View>

            <View style={s.card}>
              <Field
                label="About me"
                value={bio || 'Tell us a little about yourself.'}
              />
              <Field
                label="Location"
                value={location || 'Location not added'}
              />
              <Button
                secondary
                label="Edit profile"
                onPress={() => navigate('edit-profile')}
              />
            </View>

            {section('Your activity')}

            <View style={s.menuCard}>
              <MenuRow
                emoji="🧾"
                title="My orders"
                subtitle="Track and manage your orders"
                onPress={() => navigate('my-orders')}
              />
              <MenuRow
                emoji="📥"
                title="Incoming orders"
                subtitle="Orders from your customers"
                onPress={() => navigate('incoming-orders')}
              />
            </View>

            {section('Your kitchen')}

            <View style={s.menuCard}>
              <MenuRow
                emoji="🍳"
                title={isCook ? 'My listings' : 'Become a home cook'}
                subtitle={
                  isCook
                    ? 'Manage your homemade meals'
                    : 'Share your cooking with others'
                }
                onPress={() =>
                  navigate(isCook ? 'my-listings' : 'cook')
                }
              />
            </View>
          </>
        )}

        {section('Account settings')}

        <View style={s.menuCard}>
          <MenuRow
            emoji="🔒"
            title="Change password"
            subtitle="Manage your account security"
            onPress={() => navigate('change-password')}
          />

          <MenuRow
            emoji="↪"
            title="Log out"
            danger
            onPress={() => {
              Alert.alert(
                'Log out?',
                'You can log back in at any time.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: () => { void logout(); },
                  },
                ]
              );
            }}
          />
        </View>

        <Text style={s.footerBrand}>
          homecooked. • Made for community
        </Text>
      </>,
      true
    );
  }

  // EDIT PROFILE

  if (screen === 'edit-profile') {
    return page(
      <>
        {back('profile', 'My profile')}

        <Heading
          eyebrow="PERSONAL INFORMATION"
          title="Edit profile"
          subtitle="Let the community get to know you."
        />

        {!profileReady ? (
          <Text style={s.smallMuted}>Profile is not ready.</Text>
        ) : (
          <>
            <View style={s.avatarEditor}>
              {avatar(112)}

              <TouchableOpacity
                disabled={busy}
                onPress={chooseProfilePicture}
              >
                <Text style={s.link}>
                  {avatarUrl ? 'Change photo' : 'Upload a photo'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.card}>
              <Input
                label="Full name"
                placeholder="Your name"
                value={fullName}
                onChangeText={setFullName}
                editable={!busy}
              />

              <Input
                label="About you"
                placeholder="Tell us a little about yourself..."
                value={bio}
                onChangeText={setBio}
                multiline
                editable={!busy}
              />

              <Input
                label="City or location"
                placeholder="Seattle, WA"
                value={location}
                onChangeText={setLocation}
                editable={!busy}
              />

              <View style={s.divider} />

              <View style={s.switchRow}>
                <View style={{ flex: 1, paddingRight: 14 }}>
                  <Text style={s.menuTitle}>Home cook account</Text>
                  <Text style={s.smallMuted}>
                    Publish meals and receive orders.
                  </Text>
                </View>

                <Switch
                  value={isCook}
                  onValueChange={setIsCook}
                  trackColor={{ false: '#DADFD8', true: '#83B08B' }}
                  disabled={busy}
                />
              </View>

              <Button
                label={busy ? 'Saving...' : 'Save changes'}
                disabled={busy}
                onPress={saveProfile}
              />
            </View>
          </>
        )}
      </>
    );
  }

  // EXPLORE

  if (screen === 'meals') {
    let visible = availableMeals.filter(item => {
      const query = search.trim().toLowerCase();

      return `${item.title} ${item.description} ${item.location}`
        .toLowerCase()
        .includes(query);
    });

    if (filter === 'Under $15') {
      visible = visible.filter(item => Number(item.price) < 15);
    }

    if (filter === 'Lowest price') {
      visible = [...visible].sort(
        (a, b) => Number(a.price) - Number(b.price)
      );
    }

    if (filter === 'My city') {
      visible = visible.filter(item =>
        !!location.trim() &&
        item.location.toLowerCase().includes(
          location.trim().toLowerCase()
        )
      );
    }

    return page(
      <>
        <Heading
          eyebrow="DISCOVER SOMETHING DELICIOUS"
          title="Explore meals"
          subtitle="Real food, made by real people."
        />

        <View style={s.searchBox}>
          <Text style={s.searchIcon}>⌕</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search meals or locations"
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={s.clearSearch}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {chips(
          ['All meals', 'Under $15', 'Lowest price', 'My city'],
          filter,
          setFilter
        )}

        {section(
          `${visible.length} meals`,
          'Refresh',
          () => { void loadListings(); }
        )}

        {loadingListings ? loading() : listingError ? (
          <Empty
            emoji="!"
            title="Couldn't load meals"
            description={listingError}
            action="Try again"
            onPress={loadListings}
          />
        ) : visible.length === 0 ? (
          <Empty
            emoji="🍽️"
            title="No meals found"
            description={
              filter === 'My city' && !location.trim()
                ? 'Add your city in your profile to use this filter.'
                : 'Try a different search or explore again later.'
            }
            action="Clear filters"
            onPress={() => {
              setSearch('');
              setFilter('All meals');
            }}
          />
        ) : visible.map(item => mealCard(item))}
      </>,
      true
    );
  }

  // COOK DASHBOARD

  if (screen === 'my-listings') {
    const active = ownListings.filter(
      item => item.is_available && item.portions > 0
    );

    const portions = ownListings.reduce(
      (total, item) => total + item.portions, 0
    );

    return page(
      <>
        {back('profile', 'My profile')}

        <Heading
          eyebrow="COOK DASHBOARD"
          title="Your kitchen"
          subtitle="Manage your meals and grow your home cooking business."
        />

        <View style={s.statsRow}>
          {[
            { value: ownListings.length, label: 'Listings' },
            { value: active.length, label: 'Active' },
            { value: portions, label: 'Portions' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {isCook && profileReady && (
          <Button
            label="+ Create a meal"
            onPress={() => openListingForm()}
          />
        )}

        <Button
          secondary
          label="View incoming orders"
          onPress={() => navigate('incoming-orders')}
        />

        {section(
          'Your listings',
          'Refresh',
          () => { void loadListings(); }
        )}

        {loadingListings ? loading() : listingError ? (
          <Empty
            emoji="!"
            title="Couldn't load listings"
            description={listingError}
            action="Try again"
            onPress={loadListings}
          />
        ) : ownListings.length === 0 ? (
          <Empty
            emoji="🍳"
            title="Your kitchen is waiting"
            description="Create your first listing and share something delicious."
            action={isCook ? 'Create your first meal' : 'Become a cook'}
            onPress={() =>
              isCook ? openListingForm() : navigate('cook')
            }
          />
        ) : ownListings.map(item => mealCard(item, true))}
      </>
    );
  }

  // CREATE AND EDIT LISTINGS

  if (screen === 'listing-form') {
    if (!profileReady || !isCook) {
      return page(
        <>
          {back()}
          <Empty
            emoji="👨‍🍳"
            title="Home cook account required"
            description="Enable the home cook option in your profile."
            action="Edit profile"
            onPress={() => navigate('edit-profile')}
          />
        </>
      );
    }

    return page(
      <>
        {back('my-listings', 'Your kitchen')}

        <Heading
          eyebrow="FROM YOUR KITCHEN"
          title={editingId ? 'Edit your meal' : 'Create a meal'}
          subtitle="Give your customers something to look forward to."
        />

        <View style={s.card}>
          <Text style={s.formSection}>01 / Meal photography</Text>

          <FoodImage uri={mealImage} />

          <Button
            secondary
            label={mealImage ? 'Change food photo' : '+ Upload food photo'}
            disabled={busy}
            onPress={chooseMealImage}
          />

          <Text style={s.helperText}>
            Use a clear photo of the meal you are selling.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.formSection}>02 / Meal information</Text>

          <Input
            label="Meal name"
            placeholder="Homemade chicken and rice"
            value={mealTitle}
            onChangeText={setMealTitle}
            editable={!busy}
          />

          <Input
            label="Description"
            placeholder="Describe your meal, ingredients and flavors..."
            value={mealDescription}
            onChangeText={setMealDescription}
            multiline
            editable={!busy}
          />

          <Input
            label="Location"
            placeholder="Seattle, WA"
            value={mealLocation}
            onChangeText={setMealLocation}
            editable={!busy}
          />
        </View>

        <View style={s.card}>
          <Text style={s.formSection}>03 / Price and availability</Text>

          <View style={s.twoColumns}>
            <View style={{ flex: 1 }}>
              <Input
                label="Price ($)"
                placeholder="12.99"
                value={mealPrice}
                onChangeText={setMealPrice}
                keyboardType="decimal-pad"
                editable={!busy}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Input
                label="Portions"
                placeholder="5"
                value={mealPortions}
                onChangeText={setMealPortions}
                keyboardType="number-pad"
                editable={!busy}
              />
            </View>
          </View>

          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.menuTitle}>Available to order</Text>
              <Text style={s.smallMuted}>
                Show this meal in the marketplace.
              </Text>
            </View>

            <Switch
              value={available}
              onValueChange={setAvailable}
              disabled={busy}
              trackColor={{ false: '#DADFD8', true: '#83B08B' }}
            />
          </View>
        </View>

        <Button
          label={
            busy
              ? 'Saving...'
              : editingId
              ? 'Save changes'
              : 'Publish meal'
          }
          disabled={busy}
          onPress={saveListing}
        />

        <Button
          secondary
          label="Cancel"
          disabled={busy}
          onPress={() => navigate('my-listings')}
        />
      </>
    );
  }

  // MEAL DETAILS

  if (screen.startsWith('meal-')) {
    const item = listings.find(
      listing => listing.id === screen.slice(5)
    );

    if (!item) {
      return page(
        <>
          {back('meals', 'Explore')}
          <Empty
            emoji="🍽️"
            title="Meal unavailable"
            description="This listing may no longer be available."
            action="Explore meals"
            onPress={() => navigate('meals')}
          />
        </>
      );
    }

    const canOrder =
      item.cook_id !== userId &&
      item.is_available &&
      item.portions > 0;

    return page(
      <>
        {back(detailsBack, 'Back to meals')}

        <FoodImage uri={item.image_url} large />

        <View style={s.detailsHeading}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>HOMEMADE WITH CARE</Text>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.subtitle}>⌖ {item.location}</Text>
          </View>
          <Badge status={
            item.is_available && item.portions > 0
              ? 'available'
              : 'unavailable'
          } />
        </View>

        <View style={s.detailsPriceRow}>
          <Text style={s.bigPrice}>{money(item.price)}</Text>
          <Text style={s.smallMuted}> / portion</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>About this meal</Text>
          <Text style={s.bodyText}>{item.description}</Text>

          <View style={s.divider} />

          <View style={s.twoColumns}>
            <View style={s.detailTile}>
              <Text style={{ fontSize: 25 }}>🍽️</Text>
              <Text style={s.menuTitle}>{item.portions}</Text>
              <Text style={s.smallMuted}>Portions left</Text>
            </View>

            <View style={s.detailTile}>
              <Text style={{ fontSize: 25 }}>🏡</Text>
              <Text style={s.menuTitle}>Homemade</Text>
              <Text style={s.smallMuted}>Home cook</Text>
            </View>
          </View>
        </View>

        <View style={s.infoBox}>
          <Text style={s.infoText}>
            Questions about ingredients or allergens?
            Confirm them with the cook before consuming your meal.
          </Text>
        </View>

        {canOrder ? (
          <Button
            label={`Order now · ${money(item.price)}`}
            onPress={() => openOrderForm(item)}
          />
        ) : (
          <Text style={s.centerMuted}>
            {item.cook_id === userId
              ? 'This is your own food listing.'
              : 'This meal is currently unavailable.'}
          </Text>
        )}
      </>
    );
  }

  // CHECKOUT

  if (screen === 'place-order') {
    const item = selectedListing;

    if (!item) {
      return page(
        <Empty
          emoji="🛍️"
          title="No meal selected"
          description="Find something delicious in the marketplace."
          action="Explore meals"
          onPress={() => navigate('meals')}
        />
      );
    }

    return page(
      <>
        {back('meals', 'Explore')}

        <Heading
          eyebrow="ALMOST THERE"
          title="Your order"
          subtitle="A delicious homemade meal is one step away."
        />

        <View style={s.card}>
          <View style={s.checkoutMeal}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={s.checkoutImage}
              />
            ) : (
              <View style={[s.checkoutImage, s.avatar]}>
                <Text style={{ fontSize: 32 }}>🍲</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={s.mealTitle}>{item.title}</Text>
              <Text style={s.smallMuted}>{item.location}</Text>
              <Text style={s.checkoutPrice}>
                {money(item.price)} / portion
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          <Text style={s.sectionTitle}>How many portions?</Text>

          <Text style={s.smallMuted}>
            {item.portions} portions available
          </Text>

          <View style={s.quantityRow}>
            <TouchableOpacity
              style={[
                s.quantityButton,
                quantity <= 1 && { opacity: 0.4 },
              ]}
              disabled={quantity <= 1 || busy}
              onPress={() =>
                setQuantity(previous => Math.max(1, previous - 1))
              }
            >
              <Text style={s.quantityButtonText}>−</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={s.quantityValue}>{quantity}</Text>
              <Text style={s.smallMuted}>portions</Text>
            </View>

            <TouchableOpacity
              style={[
                s.quantityButton,
                quantity >= item.portions && { opacity: 0.4 },
              ]}
              disabled={quantity >= item.portions || busy}
              onPress={() =>
                setQuantity(previous =>
                  Math.min(item.portions, previous + 1)
                )
              }
            >
              <Text style={s.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Order summary</Text>

          <View style={s.summaryRow}>
            <Text style={s.smallMuted}>
              {quantity} × {money(item.price)}
            </Text>
            <Text style={s.menuTitle}>
              {money(quantity * item.price)}
            </Text>
          </View>

          <View style={s.divider} />

          <View style={s.summaryRow}>
            <Text style={s.menuTitle}>Total</Text>
            <Text style={s.bigPrice}>
              {money(quantity * item.price)}
            </Text>
          </View>
        </View>

        <View style={s.infoBox}>
          <Text style={s.menuTitle}>Payment information</Text>
          <Text style={s.infoText}>
            Your order will be sent to the home cook for
            approval. No online payment is collected by this app.
          </Text>
        </View>

        <Button
          label={
            busy
              ? 'Placing order...'
              : `Confirm order · ${money(quantity * item.price)}`
          }
          disabled={busy}
          onPress={confirmOrder}
        />
      </>
    );
  }

  // CUSTOMER AND COOK ORDERS

  if (screen === 'my-orders' || screen === 'incoming-orders') {
    const incoming = screen === 'incoming-orders';

    const all = orders.filter(order =>
      incoming
        ? order.cook_id === userId
        : order.customer_id === userId
    );

    const visible = all.filter(order => {
      if (orderFilter === 'Active') {
        return ['pending', 'accepted'].includes(order.status);
      }

      if (orderFilter === 'Past') {
        return ['completed', 'declined', 'cancelled']
          .includes(order.status);
      }

      return true;
    });

    return page(
      <>
        <Heading
          eyebrow={incoming ? 'COOK DASHBOARD' : 'YOUR ACTIVITY'}
          title={incoming ? 'Incoming orders' : 'My orders'}
          subtitle={
            incoming
              ? 'Manage orders from your customers.'
              : 'Keep track of every delicious meal.'
          }
        />

        <View style={s.segment}>
          <TouchableOpacity
            style={[
              s.segmentItem,
              !incoming && s.segmentActive,
            ]}
            onPress={() => navigate('my-orders')}
          >
            <Text style={[
              s.segmentText,
              !incoming && { color: C.white },
            ]}>My orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.segmentItem,
              incoming && s.segmentActive,
            ]}
            onPress={() => navigate('incoming-orders')}
          >
            <Text style={[
              s.segmentText,
              incoming && { color: C.white },
            ]}>Incoming</Text>
          </TouchableOpacity>
        </View>

        {chips(
          ['All', 'Active', 'Past'],
          orderFilter,
          setOrderFilter
        )}

        {section(
          `${visible.length} orders`,
          'Refresh',
          () => { void loadOrders(); }
        )}

        {loadingOrders ? loading() : orderError ? (
          <Empty
            emoji="!"
            title="Couldn't load orders"
            description={orderError}
            action="Try again"
            onPress={loadOrders}
          />
        ) : visible.length === 0 ? (
          <Empty
            emoji="🧾"
            title="No orders here yet"
            description={
              incoming
                ? 'Orders from your customers will appear here.'
                : 'Your meal orders will appear here.'
            }
            action={!incoming ? 'Explore meals' : undefined}
            onPress={() => navigate('meals')}
          />
        ) : (
          visible.map(order => (
            <View key={order.id} style={s.orderCard}>
              <View style={s.orderTop}>
                <View style={s.orderIcon}>
                  <Text style={{ fontSize: 25 }}>🥡</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.mealTitle}>
                    {order.meal_title}
                  </Text>
                  <Text style={s.smallMuted}>
                    #{order.id.slice(0, 8)}
                  </Text>
                </View>

                <Badge status={order.status} />
              </View>

              <Text style={s.orderDate}>
                {new Date(order.created_at).toLocaleString()}
              </Text>

              <View style={s.divider} />

              <View style={s.summaryRow}>
                <Text style={s.smallMuted}>
                  {order.quantity} portion(s) × {money(order.unit_price)}
                </Text>
                <Text style={s.checkoutPrice}>
                  {money(order.total_price)}
                </Text>
              </View>

              {order.status === 'pending' && (
                <View style={s.infoBox}>
                  <Text style={s.infoText}>
                    {incoming
                      ? 'This order is waiting for your response.'
                      : 'Waiting for the home cook to accept your order.'}
                  </Text>
                </View>
              )}

              {incoming && order.status === 'pending' && (
                <View style={s.twoColumns}>
                  <View style={{ flex: 1 }}>
                    <Button
                      danger
                      label="Decline"
                      disabled={busy}
                      onPress={() =>
                        confirmStatus(order.id, 'declined')
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Accept"
                      disabled={busy}
                      onPress={() =>
                        confirmStatus(order.id, 'accepted')
                      }
                    />
                  </View>
                </View>
              )}

              {incoming && order.status === 'accepted' && (
                <Button
                  label="Mark as completed"
                  disabled={busy}
                  onPress={() =>
                    confirmStatus(order.id, 'completed')
                  }
                />
              )}

              {!incoming && order.status === 'pending' && (
                <Button
                  danger
                  label="Cancel order"
                  disabled={busy}
                  onPress={() =>
                    confirmStatus(order.id, 'cancelled')
                  }
                />
              )}

              {!incoming && order.status === 'accepted' && (
                <View style={s.infoBox}>
                  <Text style={s.infoText}>
                    Your order has been accepted!
                  </Text>
                </View>
              )}

              {order.status === 'completed' && (
                <Text style={s.successText}>
                  ✓ Order successfully completed
                </Text>
              )}

              {order.status === 'declined' && (
                <Text style={s.smallMuted}>
                  This order was declined by the cook.
                </Text>
              )}

              {order.status === 'cancelled' && (
                <Text style={s.smallMuted}>
                  This order has been cancelled.
                </Text>
              )}
            </View>
          ))
        )}
      </>,
      true
    );
  }

  // BECOME A COOK

  if (screen === 'cook') {
    return page(
      <>
        {back()}

        <View style={s.cookHero}>
          <Text style={{ fontSize: 76 }}>👨‍🍳</Text>
          <Text style={s.heroEyebrow}>YOUR KITCHEN. YOUR BUSINESS.</Text>
          <Text style={s.heroTitle}>
            Turn your passion into something delicious.
          </Text>
          <Text style={s.heroSubtitle}>
            Share your homemade meals with your community.
          </Text>
        </View>

        <Heading
          title="Cook. Share. Connect."
          subtitle="Getting started is simple."
        />

        {[
          {
            number: '01',
            title: 'Create your cook profile',
            text: 'Introduce yourself to your community.',
          },
          {
            number: '02',
            title: 'Publish your meals',
            text: 'Add photos, descriptions, prices and portions.',
          },
          {
            number: '03',
            title: 'Receive customer orders',
            text: 'Accept and manage orders from your kitchen.',
          },
        ].map(step => (
          <View key={step.number} style={s.stepCard}>
            <View style={s.stepNumber}>
              <Text style={s.stepNumberText}>{step.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuTitle}>{step.title}</Text>
              <Text style={s.smallMuted}>{step.text}</Text>
            </View>
          </View>
        ))}

        <Button
          label={
            !session
              ? 'Join Homecooked'
              : isCook
              ? 'Open your kitchen'
              : 'Set up cook profile'
          }
          onPress={() =>
            navigate(
              !session
                ? 'signup'
                : isCook
                ? 'my-listings'
                : 'edit-profile'
            )
          }
        />
      </>
    );
  }

  // HOME

  return page(
    <>
      <View style={s.homeHeader}>
        <Brand />

        <TouchableOpacity
          onPress={() => navigate('profile')}
          accessibilityLabel="Open profile"
        >
          {session ? avatar(46) : (
            <View style={s.guestAvatar}>
              <Text style={{ fontSize: 22, color: C.green }}>◎</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.locationRow}>
        <Text style={{ fontSize: 17 }}>⌖</Text>
        <Text style={s.locationText}>
          {location || 'Discover your community'}
        </Text>
      </View>

      <Heading
        eyebrow={
          session && fullName
            ? `HELLO, ${fullName.split(' ')[0].toUpperCase()}`
            : 'WELCOME TO HOMECOOKED'
        }
        title="What's cooking today?"
        subtitle="Discover something delicious, made close to home."
      />

      <TouchableOpacity
        activeOpacity={0.8}
        style={s.searchBox}
        onPress={() => navigate('meals')}
      >
        <Text style={s.searchIcon}>⌕</Text>
        <Text style={s.searchPlaceholder}>
          Find your next favorite meal
        </Text>
      </TouchableOpacity>

      <View style={s.hero}>
        <View style={s.heroDecorationOne} />
        <View style={s.heroDecorationTwo} />

        <View style={s.heroPill}>
          <Text style={s.heroPillText}>THE TASTE OF HOME</Text>
        </View>

        <Text style={s.heroEmoji}>🥘</Text>

        <Text style={s.heroTitle}>
          Good food.{'\n'}Better together.
        </Text>

        <Text style={s.heroSubtitle}>
          Homemade meals from the kitchens of your community.
        </Text>

        <Button
          accent
          label="Explore meals →"
          onPress={() => navigate('meals')}
        />
      </View>

      {section('Discover meals')}

      <View style={s.categoryRow}>
        {[
          { emoji: '🍽️', title: 'All meals', value: 'All meals' },
          { emoji: '💰', title: 'Under $15', value: 'Under $15' },
          { emoji: '🏡', title: 'My city', value: 'My city' },
          { emoji: '✨', title: 'Best prices', value: 'Lowest price' },
        ].map(category => (
          <TouchableOpacity
            key={category.title}
            style={s.category}
            onPress={() => {
              setSearch('');
              setFilter(category.value);
              navigate('meals');
            }}
          >
            <View style={s.categoryIcon}>
              <Text style={{ fontSize: 28 }}>{category.emoji}</Text>
            </View>
            <Text style={s.categoryLabel}>{category.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {section(
        'Fresh from the kitchen',
        'See all',
        () => navigate('meals')
      )}

      {!session ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>
            Find your next favorite meal
          </Text>
          <Text style={s.bodyText}>
            Join Homecooked to discover available meals,
            place orders and connect with home cooks.
          </Text>
          <Button
            label="Get started"
            onPress={() => navigate('signup')}
          />
          <Button
            secondary
            label="Log in"
            onPress={() => navigate('login')}
          />
        </View>
      ) : loadingListings ? loading() : listingError ? (
        <Empty
          emoji="!"
          title="Couldn't load meals"
          description={listingError}
          action="Try again"
          onPress={loadListings}
        />
      ) : availableMeals.length === 0 ? (
        <Empty
          emoji="🍲"
          title="Something delicious is coming"
          description="New homemade meals will appear here as cooks publish them."
          action="Explore meals"
          onPress={() => navigate('meals')}
        />
      ) : (
        availableMeals.slice(0, 3).map(item => mealCard(item))
      )}

      <View style={s.sellerBanner}>
        <Text style={{ fontSize: 42 }}>👨‍🍳</Text>
        <Text style={s.sellerTitle}>
          {isCook ? 'Your kitchen is open.' : 'Love to cook?'}
        </Text>
        <Text style={s.sellerText}>
          {isCook
            ? 'Manage your listings and keep track of customer orders.'
            : 'Turn your favorite recipes into meals your community can enjoy.'}
        </Text>

        <Button
          label={isCook ? 'Open cook dashboard' : 'Become a home cook'}
          onPress={() =>
            navigate(isCook ? 'my-listings' : 'cook')
          }
        />
      </View>

      <Text style={s.footerBrand}>
        homecooked. • Good food brings us together.
      </Text>
    </>,
    true
  );
}

// DESIGN SYSTEM

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },

  page: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logo: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoText: {
    color: C.white,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -2,
  },

  brandName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1.2,
    color: C.green,
  },

  brandTag: {
    fontSize: 8,
    letterSpacing: 1.1,
    fontWeight: '700',
    color: C.muted,
    marginTop: 2,
  },

  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  guestAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },

  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.green,
  },

  heading: {
    marginBottom: 22,
  },

  eyebrow: {
    color: C.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 10,
  },

  title: {
    fontSize: 33,
    lineHeight: 39,
    letterSpacing: -1.5,
    fontWeight: '800',
    color: C.ink,
  },

  subtitle: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 23,
    marginTop: 9,
  },

  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: C.muted,
    marginTop: 10,
    marginBottom: 10,
  },

  button: {
    backgroundColor: C.green,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 10,
  },

  buttonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  buttonSecondary: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#D3DED3',
  },

  buttonDanger: {
    backgroundColor: '#FDECEA',
  },

  buttonAccent: {
    backgroundColor: C.orange,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 23,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
  },

  inputGroup: {
    marginBottom: 16,
  },

  input: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#F6F7F3',
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    color: C.ink,
  },

  multiline: {
    minHeight: 115,
    textAlignVertical: 'top',
  },

  field: {
    marginBottom: 17,
  },

  fieldValue: {
    fontSize: 15,
    lineHeight: 23,
    color: C.muted,
  },

  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    alignSelf: 'flex-start',
    marginBottom: 22,
  },

  backArrow: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: C.white,
    color: C.green,
    fontSize: 31,
    lineHeight: 35,
    textAlign: 'center',
    overflow: 'hidden',
  },

  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.green,
  },

  smallMuted: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  centerMuted: {
    textAlign: 'center',
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    marginVertical: 12,
  },

  link: {
    color: C.green,
    fontSize: 13,
    fontWeight: '800',
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    marginBottom: 15,
  },

  sectionTitle: {
    color: C.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 18,
  },

  hero: {
    backgroundColor: C.green,
    borderRadius: 28,
    padding: 24,
    marginBottom: 25,
    overflow: 'hidden',
  },

  heroDecorationOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#24543D',
    right: -70,
    top: -60,
  },

  heroDecorationTwo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2D6045',
    right: -45,
    bottom: -60,
  },

  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF20',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    marginBottom: 18,
  },

  heroPillText: {
    color: '#E2F1DF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  heroEmoji: {
    fontSize: 74,
    textAlign: 'right',
    marginBottom: 4,
  },

  heroTitle: {
    color: C.white,
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
  },

  heroSubtitle: {
    color: '#D3E5D6',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 14,
  },

  heroEyebrow: {
    color: '#B8D4BD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginVertical: 16,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    paddingHorizontal: 15,
    minHeight: 56,
    marginBottom: 20,
    gap: 12,
  },

  searchIcon: {
    fontSize: 29,
    color: C.green,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.ink,
    paddingVertical: 12,
  },

  searchPlaceholder: {
    color: C.muted,
    fontSize: 14,
    flex: 1,
  },

  clearSearch: {
    fontSize: 26,
    color: C.muted,
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },

  category: {
    flex: 1,
    alignItems: 'center',
  },

  categoryIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  categoryLabel: {
    fontSize: 11,
    color: C.ink,
    fontWeight: '700',
    textAlign: 'center',
  },

  chips: {
    gap: 8,
    paddingBottom: 12,
  },

  chip: {
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
  },

  chipActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },

  chipTextActive: {
    color: C.white,
  },

  mealCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
    shadowColor: '#183D2B',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  foodImage: {
    width: '100%',
    height: 215,
    borderRadius: 18,
    backgroundColor: C.greenLight,
  },

  foodPlaceholder: {
    height: 190,
    borderRadius: 18,
    backgroundColor: '#E9EFE2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 12,
    color: C.green,
    fontWeight: '600',
    marginTop: 8,
  },

  priceOverlay: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: C.white,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 13,
  },

  priceOverlayText: {
    color: C.green,
    fontSize: 17,
    fontWeight: '800',
  },

  mealBody: {
    padding: 17,
  },

  mealTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: C.ink,
    marginBottom: 5,
  },

  mealDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: C.muted,
    marginTop: 10,
    marginBottom: 14,
  },

  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  portionText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },

  mealArrow: {
    color: C.green,
    fontSize: 23,
    fontWeight: '600',
  },

  mealActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  mealActionSingle: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 9,
    paddingBottom: 9,
    paddingHorizontal: 10,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  tabIconBox: {
    width: 54,
    height: 35,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabIconActive: {
    backgroundColor: C.greenLight,
  },

  tabIcon: {
    fontSize: 27,
    color: '#899489',
    lineHeight: 32,
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
  },

  tabLabelActive: {
    color: C.green,
    fontWeight: '800',
  },

  empty: {
    padding: 26,
    backgroundColor: C.white,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 21,
    color: C.ink,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptyDescription: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },

  sellerBanner: {
    backgroundColor: '#F3E5CF',
    padding: 23,
    borderRadius: 25,
    marginVertical: 10,
  },

  sellerTitle: {
    color: C.green,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 12,
  },

  sellerText: {
    color: '#6E695B',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 12,
  },

  footerBrand: {
    textAlign: 'center',
    color: C.muted,
    fontSize: 11,
    marginTop: 25,
    marginBottom: 8,
  },

  authHero: {
    backgroundColor: C.green,
    padding: 24,
    borderRadius: 25,
    marginTop: 25,
    marginBottom: 28,
  },

  authHeroEmoji: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 12,
  },

  authHeroTitle: {
    color: C.white,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.7,
    textAlign: 'center',
  },

  authHeroText: {
    color: '#CFE1D2',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 9,
  },

  authIllustration: {
    backgroundColor: C.greenLight,
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 30,
  },

  avatar: {
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileHero: {
    backgroundColor: C.green,
    borderRadius: 27,
    padding: 28,
    alignItems: 'center',
    marginBottom: 18,
  },

  profileName: {
    color: C.white,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 15,
    textAlign: 'center',
  },

  profileEmail: {
    color: '#D1E2D4',
    fontSize: 13,
    marginTop: 7,
  },

  profileRole: {
    backgroundColor: '#FFFFFF20',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginTop: 15,
  },

  profileRoleText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
  },

  avatarEditor: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 25,
  },

  menuCard: {
    backgroundColor: C.white,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 15,
    marginBottom: 20,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 17,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },

  menuIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 3,
  },

  chevron: {
    fontSize: 25,
    color: C.muted,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 12,
  },

  infoBox: {
    backgroundColor: C.greenLight,
    padding: 15,
    borderRadius: 15,
    marginVertical: 10,
  },

  infoText: {
    color: '#49634D',
    fontSize: 13,
    lineHeight: 21,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 27,
    fontWeight: '800',
    color: C.green,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    marginTop: 5,
  },

  formSection: {
    fontSize: 17,
    fontWeight: '800',
    color: C.green,
    marginBottom: 20,
  },

  helperText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
  },

  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },

  detailsHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 24,
  },

  detailsPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 20,
  },

  bigPrice: {
    color: C.green,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -1,
  },

  detailTile: {
    flex: 1,
    backgroundColor: '#F6F7F3',
    borderRadius: 17,
    padding: 15,
    alignItems: 'center',
    gap: 6,
  },

  checkoutMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },

  checkoutImage: {
    width: 90,
    height: 90,
    borderRadius: 17,
  },

  checkoutPrice: {
    fontSize: 18,
    color: C.green,
    fontWeight: '800',
    marginTop: 5,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 25,
  },

  quantityButton: {
    backgroundColor: C.greenLight,
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quantityButtonText: {
    color: C.green,
    fontSize: 30,
    fontWeight: '600',
  },

  quantityValue: {
    color: C.green,
    fontSize: 32,
    fontWeight: '800',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: '#E6E9E1',
    padding: 5,
    borderRadius: 16,
    marginBottom: 20,
  },

  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },

  segmentActive: {
    backgroundColor: C.green,
  },

  segmentText: {
    fontSize: 14,
    color: C.muted,
    fontWeight: '700',
  },

  orderCard: {
    backgroundColor: C.white,
    padding: 18,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
  },

  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  orderIcon: {
    width: 47,
    height: 47,
    backgroundColor: C.greenLight,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  orderDate: {
    fontSize: 11,
    color: C.muted,
    marginTop: 13,
  },

  successText: {
    color: '#23733D',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 17,
  },

  cookHero: {
    backgroundColor: C.green,
    padding: 25,
    borderRadius: 27,
    marginBottom: 28,
  },

  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: C.white,
    padding: 17,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },

  stepNumber: {
    backgroundColor: C.greenLight,
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepNumberText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.green,
  },

  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  splashLogo: {
    width: 100,
    height: 100,
    backgroundColor: C.green,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  splashLogoText: {
    fontSize: 49,
    fontWeight: '900',
    letterSpacing: -4,
    color: C.white,
  },

  splashTitle: {
    fontSize: 35,
    fontWeight: '900',
    color: C.green,
    letterSpacing: -2,
    marginTop: 18,
    marginBottom: 8,
  },
});