# ==============================================================================
# == Step 4: EDA and Visualization Generation (Revised based on Feedback) ==
# ==============================================================================
print("--- Start Step 4: EDA and Visualization ---")

# --- 4.1 Import Libraries ---
import pandas as pd
import numpy as np
import altair as alt
import os

# --- 4.2 Define File Paths ---
# !! Ensure these paths are correct for your project !!
FINAL_DATA_FILE = 'final_nvda_stock_sentiment_data.csv'
WEB_DATA_DIR = 'web/data'  # Directory to save visualization outputs

# Create output directory if it doesn't exist
if not os.path.exists(WEB_DATA_DIR):
    print(f"Creating directory: {WEB_DATA_DIR}")
    os.makedirs(WEB_DATA_DIR)

# --- 4.3 Load Final Dataset ---
print(f"Load the final dataset: {FINAL_DATA_FILE}")
try:
    final_df = pd.read_csv(FINAL_DATA_FILE, parse_dates=['stock_date'])
    print("The dataset was loaded successfully.")
    # Ensure sentiment_numeric exists if not loaded correctly from CSV (sometimes types change)
    if 'sentiment_numeric' not in final_df.columns and 'sentiment_label' in final_df.columns:
        sentiment_map = {'positive': 1, 'neutral': 0, 'negative': -1}
        final_df['sentiment_numeric'] = final_df['sentiment_label'].map(sentiment_map).fillna(0)
    # Ensure daily_return exists
    if 'daily_return' not in final_df.columns and 'close' in final_df.columns:
        final_df['daily_return'] = final_df['close'].pct_change() * 100
        final_df['daily_return'] = final_df['daily_return'].fillna(0)  # Fill NaN for the first day with 0

except FileNotFoundError:
    print(f"Error: Unable to find final data file {FINAL_DATA_FILE}")
    exit()
except Exception as e:
    print(f"Error: An error occurred while loading the final data file: {e}")
    exit()

# --- 4.4 Exploratory Data Analysis (EDA) ---
print("\n--- Start Preliminary EDA ---")
# (Keeping EDA section brief as it was likely run before, focus on vis generation)
print("Data info (final_df.info()):")
print(final_df.info())
print("\nData preview (final_df.head()):")
print(final_df.head())

# Calculate correlations if needed for insights
print("\nCalculating the correlation matrix of key columns:")
correlation_cols = [
    'close', 'volume', 'daily_return',
    'prev_1day_mean_score', 'prev_1day_news_count', 'prev_1day_mean_numeric'
]
correlation_cols = [col for col in correlation_cols if col in final_df.columns]
if correlation_cols:  # Only calculate if columns exist
    correlation_matrix = final_df[correlation_cols].corr()
    print(correlation_matrix)
    if 'prev_1day_mean_score' in correlation_matrix.index and 'daily_return' in correlation_matrix.columns:
        print(
            f"\nCorrelation(prev_1day_mean_score, daily_return): {correlation_matrix.loc['prev_1day_mean_score', 'daily_return']:.4f}")
    if 'prev_1day_news_count' in correlation_matrix.index and 'daily_return' in correlation_matrix.columns:
        print(
            f"Correlation(prev_1day_news_count, daily_return): {correlation_matrix.loc['prev_1day_news_count', 'daily_return']:.4f}")
else:
    print("Skipping correlation calculation as key columns are missing.")

print("--- Preliminary EDA completion ---")

# --- 4.5 Generate Visualizations ---
print("\n--- Start generating visualizations ---")

# --- Generate Chart 1: Stock Price Time Series (with Interval Selection) ---
print("Generate Altair Chart 1: Stock Price Time Series...")
try:
    # --- MODIFICATION START (Added Interval Selection) ---
    interval = alt.selection_interval(encodings=['x'])  # Define interval selection on x-axis
    # --- MODIFICATION END ---

    price_chart = alt.Chart(final_df).mark_line().encode(
        x=alt.X('stock_date', title='Date'),
        y=alt.Y('close', title='Closing Price (USD)'),
        tooltip=[alt.Tooltip('stock_date'), alt.Tooltip('close', format="$.2f")]
    ).properties(
        title='Nvidia (NVDA) Stock Price Over Time'
    ).add_params(  # Add the selection capability
        interval
    )
    # Note: To make this selection *do* something (like zoom or filter another chart),
    # you need corresponding JavaScript code using the Vega View API in Step 5.
    # This Python code just *enables* the selection possibility in the chart spec.

    altair_chart1_path = os.path.join(WEB_DATA_DIR, 'nvidia_price_timeseries.json')
    price_chart.save(altair_chart1_path)
    print(f"Altair Chart 1 has been saved to: {altair_chart1_path}")
except Exception as e:
    print(f"Error: Failed to generate or save Altair Chart 1: {e}")

# --- Generate Chart 2: Sentiment Histogram (Moved earlier in sequence as per feedback) ---
# (Assuming Vis 3 from previous code is now Vis 2)
print("\nGenerate Altair Chart 2: Histogram of Previous Day Sentiment Scores...")
try:
    # Optional: Keep interval selection if useful, or remove if not needed here
    hist_interval_selection = alt.selection_interval(encodings=['x'])

    sentiment_hist = alt.Chart(final_df).mark_bar().encode(
        x=alt.X('prev_1day_mean_score:Q', bin=alt.Bin(maxbins=30), title='Previous Day Avg. Sentiment Score'),
        y=alt.Y('count()', title='Number of Days'),
        tooltip=[alt.Tooltip('prev_1day_mean_score:Q', bin=alt.Bin(maxbins=30)), alt.Tooltip('count()')]
    ).properties(
        title='Distribution of Daily Sentiment Scores'
    ).add_params(
        hist_interval_selection
    )

    altair_chart2_path = os.path.join(WEB_DATA_DIR, 'sentiment_histogram.json')  # Save with new number if needed
    sentiment_hist.save(altair_chart2_path)
    print(f"Altair Chart 2 (Histogram) has been saved to: {altair_chart2_path}")
except Exception as e:
    print(f"Error: Failed to generate or save Altair Chart 2 (Histogram): {e}")

# --- Generate Chart 3: Return vs. Sentiment Scatter Plot ---
# (Assuming Vis 2 from previous code is now Vis 3)
print("\nGenerate Altair chart 3: Return rate vs. previous day sentiment score...")
try:
    scatter_chart = alt.Chart(final_df).mark_point(opacity=0.4, size=10).encode(
        x=alt.X('prev_1day_mean_score', title='Previous Day Avg. Sentiment Score'),
        y=alt.Y('daily_return', title='Daily Return (%)'),
        tooltip=[
            alt.Tooltip('stock_date'),
            alt.Tooltip('prev_1day_mean_score', format=".3f"),
            alt.Tooltip('daily_return', format=".2f")
        ],
    ).properties(
        title='NVDA Daily Return vs. Previous Day Sentiment Score'
    ).interactive()  # Keep basic interaction like zoom/pan/tooltip

    altair_chart3_path = os.path.join(WEB_DATA_DIR,
                                      'return_vs_sentiment_scatter.json')  # Save with new number if needed
    scatter_chart.save(altair_chart3_path)
    print(f"Altair Chart 3 (Scatter) has been saved to: {altair_chart3_path}")
except Exception as e:
    print(f"Error: Failed to generate or save Altair Chart 3 (Scatter): {e}")

# --- Generate Chart 4: Box Plot (with Binned X-axis, No Color) ---
# (Assuming Vis 4 remains Vis 4, but now modified)
print("\nGenerate Altair Chart 4: Box plot of daily returns by BINNED sentiment category...")
try:
    # --- MODIFICATION START (Binning the sentiment score) ---
    # Define bins and labels for the sentiment score
    # Adjust bins based on your data range (use final_df['prev_1day_mean_score'].describe())
    bins = [-1.1, -0.5, -0.1, 0.1, 0.5, 1.1]  # Bins: < -0.5, -0.5 to -0.1, ..., > 0.5
    labels = ['Very Neg (< -0.5)', 'Neg (-0.5 to -0.1)', 'Neu (-0.1 to 0.1)', 'Pos (0.1 to 0.5)', 'Very Pos (> 0.5)']

    # Create a new column with the binned categories
    final_df['sentiment_bin'] = pd.cut(final_df['prev_1day_mean_score'], bins=bins, labels=labels,
                                       right=False)  # right=False means interval is [left, right)
    # Handle potential NaNs if scores fall outside bins (though unlikely with -1.1 to 1.1)
    final_df['sentiment_bin'] = final_df['sentiment_bin'].cat.add_categories('Unknown').fillna('Unknown')
    # --- MODIFICATION END ---

    return_boxplot = alt.Chart(final_df).mark_boxplot(extent='min-max').encode(
        # --- MODIFICATION START (Using binned category on X-axis) ---
        x=alt.X('sentiment_bin:O', title='Previous Day Sentiment Category', sort=labels),
        # :O indicates Ordinal/Categorical, sort ensures order
        # --- MODIFICATION END ---
        y=alt.Y('daily_return:Q', title='Daily Return (%)'),
        # --- MODIFICATION START (Removed color encoding) ---
        # color=alt.Color('sentiment_bin:O', legend=None), # REMOVED or commented out
        # --- MODIFICATION END ---
        tooltip=[
            alt.Tooltip('sentiment_bin:O', title='Sentiment Bin'),  # Show the bin label
            alt.Tooltip('count()'),
            alt.Tooltip('median(daily_return):Q', title='Median Return', format='.2f'),
            alt.Tooltip('mean(daily_return):Q', title='Mean Return', format='.2f'),
            alt.Tooltip('min(daily_return):Q', title='Min Return', format='.2f'),  # Show min/max from boxplot extent
            alt.Tooltip('max(daily_return):Q', title='Max Return', format='.2f')
        ]
    ).properties(
        title='Distribution of Daily Returns by Previous Day Sentiment Category'
    )
    # Note: Interaction like zoom/pan might not be very useful for box plots on a categorical axis

    altair_chart4_path = os.path.join(WEB_DATA_DIR,
                                      'return_by_sentiment_boxplot.json')  # Save with new number if needed
    return_boxplot.save(altair_chart4_path)
    print(f"Altair Chart 4 (Box Plot) has been saved to: {altair_chart4_path}")
except Exception as e:
    print(f"Error: Failed to generate or save Altair Chart 4 (Box Plot): {e}")

# --- Prepare Data for D3 Chart 5 ---
print("\nPreparing data required for D3.js visualization...")
try:
    # Ensure needed columns exist before selecting
    required_d3_cols = ['stock_date', 'daily_return', 'prev_1day_mean_score', 'prev_1day_news_count']
    available_d3_cols = [col for col in required_d3_cols if col in final_df.columns]
    if len(available_d3_cols) != len(required_d3_cols):
        print(f"Warning: Not all required columns for D3 data found in final_df. Found: {available_d3_cols}")

    d3_data = final_df[available_d3_cols].copy()

    # Convert date to '%Y-%m-%d' format string
    if 'stock_date' in d3_data.columns:
        d3_data['stock_date'] = d3_data['stock_date'].dt.strftime('%Y-%m-%d')

    # Fill NaN values if any remain (optional, depends on D3 handling)
    d3_data = d3_data.fillna(0)

    d3_data_path = os.path.join(WEB_DATA_DIR, 'd3_calendar_heatmap_data.csv')
    d3_data.to_csv(d3_data_path, index=False)
    print(f"Data prepared for D3 has been saved to: {d3_data_path}")
except Exception as e:
    print(f"Error: Failed to prepare or save D3 data: {e}")

# --- Placeholder for potentially more charts to meet the '5+' requirement ---
# If you need more charts, add their generation code here.

print("\n--- Visualization generation part completed ---")
print("\n--- Step 4: EDA and Visualization Execution Completed ---")
# ==============================================================================

# ====> Next step: Step 5 - Webpage Construction <====
# Use the updated chart JSON files (and D3 data CSV) generated here to build/update your HTML, CSS, JS files.