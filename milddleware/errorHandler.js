// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
    console.error(`❌ Error: ${err.message}`);
    console.error(err.stack);
    
    res.status(err.status || 500).json({
        error: err.message || 'Something went wrong',
        success: false
    });
}

module.exports = errorHandler;