const { pool } = require("../model/db");

// Search Users
//http://localhost:3000/users/search?age=22&first_name=firstName&last_name=lastname&age=12
const searchUsers = async (req, res) => {
  try {
    const { first_name, last_name, age } = req.query;
    let query = "SELECT * FROM users WHERE 1=1";
    let values = [];
    let index = 1;

    if (first_name) {
      query += ` AND first_name ILIKE $${index}`;
      values.push(`%${first_name.trim()}%`);
      index++;
    }
    if (last_name) {
      query += ` AND last_name ILIKE $${index}`;
      values.push(`%${last_name.trim()}%`);
      index++;
    }
    if (age) {
      if (isNaN(age)) {
        return res.status(400).json({ message: "Age must be a number" });
      }
      query += ` AND age = $${index}`;
      values.push(parseInt(age, 10));
      index++;
    }

    console.log("Executing Query:", query, "With Values:", values);

    const { rows } = await pool.query(query, values);

    return rows.length > 0
      ? res.status(200).json({ users: rows })
      : res.status(404).json({ message: "No users found" });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get Friend Reques
//http://localhost:3000/get-friend-requests
const getFriendRequests = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await pool.query(
      `
        SELECT 
          fr.id, 
          fr.sender_id, 
          fr.receiver_id, 
          fr.status, 
          u.id AS sender_id, 
          u.first_name, 
          u.last_name, 
          u.email 
        FROM friend_requests fr
        JOIN users u ON fr.sender_id = u.id
        WHERE fr.receiver_id = $1 AND fr.status = 0
        `,
      [userId]
    );

    if (result.rows.length > 0) {
      return res.status(200).json({ requests: result.rows });
    } else {
      return res.status(404).json({ message: "No pending friend requests." });
    }
  } catch (error) {
    console.error("Error getting friend requests:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Send Friend Request
//http://localhost:3000/friend-requests/userID
const sendFriendRequest = async (req, res) => {
  try {
    const sender_id = req.session.user.id;
    const receiver_id = req.params.receiver_id;

    if (sender_id === receiver_id) {
      return res
        .status(400)
        .json({ message: "You cannot send a friend request to yourself" });
    }

    const existingRequest = await pool.query(
      `SELECT * FROM friend_requests 
             WHERE (sender_id = $1 AND receiver_id = $2) 
             OR (sender_id = $2 AND receiver_id = $1)`,
      [sender_id, receiver_id]
    );

    if (existingRequest.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Friend request already exists or already friends" });
    }

    const result = await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status) 
             VALUES ($1, $2, 0) RETURNING *`,
      [sender_id, receiver_id]
    );

    res
      .status(201)
      .json({
        message: "Friend request sent successfully",
        friend_request: result.rows[0],
      });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Accept Friend Request
//http://localhost:3000/friend-requests/userID
const acceptFriendRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    const { request_id } = req.params;
    const res1 = await client.query(
      `SELECT sender_id, receiver_id FROM friend_requests WHERE id = $1`,
      [request_id]
    );
    if (res1.rows.length === 0)
      return res.status(404).json({ message: "Friend request not found" });
    const { sender_id, receiver_id } = res1.rows[0];
    await client.query(`UPDATE friend_requests SET status = 1 WHERE id = $1`, [
      request_id,
    ]);
    await client.query(
      `INSERT INTO friendships (user1_id, user2_id) VALUES ($1, $2)`,
      [sender_id, receiver_id]
    );

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    client.release();
  }
};
//http://localhost:3000/friend-requests/accept/3
const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const requestId = req.params.requestId;

    const result = await pool.query(
      "SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = 0",
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Friend request not found or already processed" });
    }

    await pool.query("UPDATE friend_requests SET status = 2 WHERE id = $1", [
      requestId,
    ]);

    return res
      .status(200)
      .json({ message: "Friend request rejected successfully" });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  getFriendRequests,
  rejectFriendRequest,
};
