1. **Remove `syncDriverLocation` polling in `TrackingMapView`:** Currently, `TrackingMapView` sets up an interval to call `syncDriverLocation` every 5 seconds. This translates to an explicit `getUserByIdFromDB` RPC query.
2. **Utilize `useApp().users`:** The `AppContext` already polls `getAllUsersFromDB` every 5 seconds (when there's an active order or recent activity) and stores it in the `users` array. We can just derive `currentDriver` from `users` array instead of polling manually.
3. **Verify functionality:** Make sure the frontend still compiles and works.
