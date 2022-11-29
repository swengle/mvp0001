import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CameraScreen from "./editor/CameraScreen";
import DetailsScreen from "./editor/DetailsScreen";
import SelectEmojiScreen from "./editor/SelectEmojiScreen";

const Stack = createNativeStackNavigator();

const AuthStack = function() {
  return (
    <Stack.Navigator>
      <Stack.Group>
        <Stack.Screen name="CameraScreen" component={CameraScreen} options={{headerShown: false}}/>
        <Stack.Screen name="DetailsScreen" component={DetailsScreen} options={{headerShown: false}}/>
        <Stack.Screen name="SelectEmojiScreen" component={SelectEmojiScreen} options={{headerShown: false}}/>
      </Stack.Group>
    </Stack.Navigator>
  );
};

export default AuthStack;
