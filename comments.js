// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');

// Create express app
const app = express();

// Add middleware
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create routes
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create post route
app.post('/posts/:id/comments', async (req, res) => {
  // Create id for comment
  const commentId = randomBytes(4).toString('hex');
  // Get content from request body
  const { content } = req.body;

  // Get comments for post
  const comments = commentsByPostId[req.params.id] || [];
  // Add new comment to comments
  comments.push({ id: commentId, content, status: 'pending' });
  // Add comments to commentsByPostId
  commentsByPostId[req.params.id] = comments;

  // Emit event to event bus
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  // Send response
  res.status(201).send(comments);
});

// Create event handler for event emitted from event bus
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);

  const { type, data } = req.body;

  // Check if type is CommentModerated
  if (type === 'CommentModerated') {
    // Get comments for post
    const comments = commentsByPostId[data.postId];
    // Find comment in comments
    const comment = comments.find((comment) => {
      return comment.id === data.id;
    });
    // Update comment status
    comment.status = data.status;

    // Emit event to event bus
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id: data.id,
        content: data.content,
        postId: data.postId,
        status: data.status,
      },
    });
  }

});