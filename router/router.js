const router = require('express').Router();
const { register, login } = require('../components/auth');
const { searchUsers, sendFriendRequest, acceptFriendRequest,getFriendRequests ,rejectFriendRequest} = require('../components/friends');
const isLoggedIn = require('../middleware/authMiddleware')

router.post('/users/register', register);//+
router.post('/users/login', login);//+
router.get('/users/search', isLoggedIn, searchUsers);//+
router.post('/friend-requests/:receiver_id', isLoggedIn, sendFriendRequest);//+
router.get('/get-friend-requests',isLoggedIn,getFriendRequests)//+
router.post('/friend-requests/accept/:request_id', isLoggedIn, acceptFriendRequest);//+
router.post('/friend-requests/reject/:requestId', isLoggedIn, rejectFriendRequest);//+

module.exports = router