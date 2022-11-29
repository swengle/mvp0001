import $ from "./setup";
import _ from "underscore";
import { useEffect } from "react";
import { LogBox, useColorScheme } from 'react-native';
import Toast, { ToastProvider } from 'react-native-toast-notifications';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Button, Dialog, Paragraph, Provider as PaperProvider, DefaultTheme as PaperDefaultTheme, DarkTheme as PaperDarkTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { proxy, subscribe, useSnapshot } from 'valtio';
import uuid from 'react-native-uuid';
import AuthStack from "./screens/AuthStack";
import MainStack from "./screens/MainStack";
import * as Font from 'expo-font';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const auth = getAuth();
SplashScreen.preventAutoHideAsync();

const CombinedDefaultTheme = {
  ...DefaultTheme,
  ...PaperDefaultTheme
};

const CombinedDarkTheme = { ...DarkTheme, ...PaperDarkTheme };

export default function App() {
  LogBox.ignoreLogs(["AsyncStorage has been extracted from react-native core and will be removed in a future release. It can now be installed and imported from '@react-native-async-storage/async-storage' instead of 'react-native'. See https://github.com/react-native-async-storage/async-storage"]);
  if (!$.session) {
    $.session = proxy({});
  }
  if (!$.dialog) {
    $.dialog = proxy({});
  }
  const app_state = useSnapshot($.app);
  const session = useSnapshot($.session);
  const dialog_state = useSnapshot($.dialog);
  const scheme = useColorScheme();
  let unsubscribe,unsubscribe2, unsubscribe3;
 
  useEffect(() => {
    async function prepare() {
      try {
        unsubscribe = subscribe($.app, function() {
          AsyncStorage.setItem("@state", JSON.stringify($.app));
        });
        
        unsubscribe2 = onAuthStateChanged(auth, async function(user) {
          if (user) {
            $.session.user = (await $.axios_api.get("/users/me")).data;
          } else {
            delete $.session.user;
          }
          $.session.is_auth_ready = true;
        });
        
        unsubscribe3 = subscribe($.session, async function() {
          if (!$.session.is_splash_hidden && $.session.is_auth_ready && $.session.is_prep_ready) {
            $.session.is_splash_hidden = true;
            _.delay(async function() {
              await SplashScreen.hideAsync();
            }, 100);
          }
        });

        await Font.loadAsync({
          "TwemojiMozilla": require("./assets/TwemojiMozilla.ttf")
        });

        const stored_app_state = await AsyncStorage.getItem("@state");
        if (stored_app_state) {
          const json = JSON.parse(stored_app_state);
          for(let key in $.app){
            if(!(key in json)) {
              delete $.app[key];
            }
          }
          _.extend($.app, json);
        }
        if (!$.app.device_id) {
          $.app.device_id = uuid.v4();
        }
      } catch (e) {
        console.warn(e);
      } finally {
        $.session.is_prep_ready = true;
      }
    }

    prepare();
  }, []);
  
  useEffect(() => {
    return () => {
      unsubscribe && unsubscribe();
      unsubscribe2 && unsubscribe2();
      unsubscribe3 && unsubscribe3();
    };
  }, []);
  
  
  if (!$.session.is_prep_ready || !$.session.is_auth_ready) {
    return null;
  }
  
  const on_press_open_settings = function() {
    $.dialog.is_camera_permission_visible = false;
    $.openAppSettings();
  };
  
  const on_press_cancel = function() {
    $.dialog.is_camera_permission_visible = false;
    $.dialog.is_photos_permission_visible = false;
  };
  
  return (
    <ToastProvider duration={2000}>
      <PaperProvider theme={scheme === "dark" || app_state.scheme === "dark" ? CombinedDarkTheme : CombinedDefaultTheme}>
        <NavigationContainer theme={scheme === "dark" || app_state.scheme === "dark" ? CombinedDarkTheme : CombinedDefaultTheme}>
          {!session.user && (
            <AuthStack/>
          )}
          {session.user && (
            <MainStack/>
          )}
        </NavigationContainer>
        <Toast ref={(ref) => global['toast'] = ref} />
        
        <Dialog visible={dialog_state.is_camera_permission_visible} dismissable={false}>
            <Dialog.Content>
              <Paragraph>Please enable permission to use the camera.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={on_press_cancel}>Cancel</Button>
              <Button onPress={on_press_open_settings}>Open Settings</Button>
            </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={dialog_state.is_photos_permission_visible} dismissable={false}>
            <Dialog.Content>
              <Paragraph>Please enable permission to access photos.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={on_press_cancel}>Cancel</Button>
              <Button onPress={on_press_open_settings}>Open Settings</Button>
            </Dialog.Actions>
        </Dialog>
        
      </PaperProvider>
    </ToastProvider>
  );
}
