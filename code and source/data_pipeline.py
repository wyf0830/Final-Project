# news_df = pd.read_csv('stocknews.csv')
import pandas as pd


news_df = pd.read_csv('news(processed).csv')
stock_df = pd.read_csv('nvidia_stock_2015_to_2024.csv')

stock_df['stock_date'] = pd.to_datetime(stock_df['date'], format='%Y/%m/%d').dt.normalize()

#transfer
numeric_cols = ['open', 'high', 'low', 'close', 'adjclose', 'volume']
for col in numeric_cols:
    stock_df[col] = pd.to_numeric(stock_df[col])

# keep what we need
stock_df = stock_df[['stock_date', 'open', 'high', 'low', 'close', 'adjclose', 'volume']]

news_df['datetime_utc'] = pd.to_datetime(news_df['Date'], utc=True)
news_df['news_date'] = news_df['datetime_utc'].dt.date
news_df['news_date'] = pd.to_datetime(news_df['news_date'])


news_df['New_text'] = news_df['New_text'].fillna('').astype(str)


news_df = news_df[['news_date', 'New_text', 'Url']]
# 保留需要的列
stock_df = stock_df[['stock_date', 'open', 'high', 'low', 'close', 'adjclose', 'volume']]

print("stock price after process:")
print(stock_df.head())
print(stock_df.info())
print("stock news after process:")
print(news_df.head())
print(news_df.info())

# ==============================================================================
# == second
# ==============================================================================
print("\n--- second step ---")


# import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import torch

# --- 2.2

print("load FinBERT ...")

model_name = "ProsusAI/finbert"
try:
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    print("successfully loaded the tokenizer")
except Exception as e:
    print(f"wrong '{model_name}'. wrong {e}")
    # 如果模型加载失败，后续步骤无法进行，建议停止脚本
    exit() # 或者 raise e

# --- 2.3
print("creat Pipeline...")



device_index = -1

classifier = pipeline(
    'sentiment-analysis',
    model=model,
    tokenizer=tokenizer,
    device=device_index,
    truncation=True
)
print(f"Pipeline create {'GPU' if device_index == 0 else 'CPU'} ).")

# --- 2.4

if 'New_text' not in news_df.columns:
    print("'news_df' cant find 'New_text' ")
    exit()

print("prepare the news")
news_texts_list = news_df['New_text'].tolist()
print(f"find {len(news_texts_list)} number of news")

# --- 2.5
print("begin")
try:

    sentiment_predictions = classifier(news_texts_list)
    print(f"sucess！total {len(sentiment_predictions)} result。")
except Exception as e:
    print(f"wrong: {e}")

    exit()

# --- 2.6

print("将情感分析结果整合回 DataFrame...")

# use tab
sentiment_labels = [pred['label'] for pred in sentiment_predictions]
sentiment_scores = [pred['score'] for pred in sentiment_predictions]


news_df['sentiment_label'] = sentiment_labels
news_df['sentiment_score'] = sentiment_scores

sentiment_map = {'positive': 1, 'neutral': 0, 'negative': -1}

news_df['sentiment_numeric'] = [sentiment_map.get(label, 0) for label in sentiment_labels]

print("add new rows")

# --- 2.7
print("\nnews_df (after anaylaze) 的前几行:")
print(news_df[['news_date', 'New_text', 'sentiment_label', 'sentiment_score', 'sentiment_numeric']].head())
print("\nnews_df 的列信息:")
print(news_df.info())


intermediate_news_file = 'news_data_with_sentiment.csv'
news_df.to_csv(intermediate_news_file, index=False)
print(f"The news data with sentiment analysis has been saved to {intermediate_news_file}")

print("--- second step ---")

# == third step

print("\n--- begin third step ---")

# --- 3.0
intermediate_news_file = 'news_data_with_sentiment.csv'
try:
    print(f"Load news data with sentiment scores from files: {intermediate_news_file}")

    news_df = pd.read_csv(intermediate_news_file, parse_dates=['news_date'])
    print("加载成功。")

    news_df['sentiment_score'] = pd.to_numeric(news_df['sentiment_score'])
    news_df['sentiment_numeric'] = pd.to_numeric(news_df['sentiment_numeric'])

except FileNotFoundError:
    print(f"error: {intermediate_news_file}。")
    exit()
except Exception as e:
    print(f"error {intermediate_news_file}  {e}")
    exit()

# --- 3.1

print("add together...")


daily_sentiment = news_df.groupby('news_date').agg(

    mean_sentiment_score=('sentiment_score', 'mean'),
    mean_sentiment_numeric=('sentiment_numeric', 'mean'),
    news_count=('Url', 'count')

).reset_index()

print("finish")
print(" (daily_sentiment) :")
print(daily_sentiment.head())

# --- 3.2

print("Create lagging emotional features")

#Move the aggregated sentiment indicators down one line to obtain the previous day's indicators
#Shift (1) represents a lag of 1 day, Shift (2) means lag of 2 days, etc
lag_days = 1
daily_sentiment[f'prev_{lag_days}day_mean_score'] = daily_sentiment['mean_sentiment_score'].shift(lag_days)
daily_sentiment[f'prev_{lag_days}day_news_count'] = daily_sentiment['news_count'].shift(lag_days)
daily_sentiment[f'prev_{lag_days}day_mean_numeric'] = daily_sentiment['mean_sentiment_numeric'].shift(lag_days)

# daily_sentiment['rolling_3day_mean_score'] = daily_sentiment['mean_sentiment_score'].rolling(window=3).mean().shift(1)

print(f"Created lag {lag_days} The emotional characteristics of heaven.")
print("Daily sentiment data preview with lagging features:")

print(daily_sentiment[['news_date', f'prev_{lag_days}day_mean_score', f'prev_{lag_days}day_news_count']].head())

# --- 3.3

print("Starting to merge stock price data and lagged sentiment data")

#Select the sentiment columns to be merged (including news_date and lagged feature columns)
sentiment_cols_to_merge = [
    'news_date',
    f'prev_{lag_days}day_mean_score',
    f'prev_{lag_days}day_news_count',
    f'prev_{lag_days}day_mean_numeric'

]

#Use left merge to ensure that all stock price records are retained
final_df = pd.merge(
    stock_df,
    daily_sentiment[sentiment_cols_to_merge],
    left_on='stock_date',
    right_on='news_date',
    how='left'
)


if 'news_date' in final_df.columns:
    final_df = final_df.drop(columns=['news_date'])

#Processing the NaN values generated after merging (lagging features are initially NaN, or some trading days do not have sentiment data from the previous day)
#The common processing method is to fill with 0, indicating that there is no news or neutral emotion
fillna_cols = [col for col in sentiment_cols_to_merge if col != 'news_date']
for col in fillna_cols:
    if col in final_df.columns:
        final_df[col] = final_df[col].fillna(0)

print("Data merging completed.")

# --- 3.4
print("Preview of the final merged DataFrame (final_def):")
print(final_df.head())
print("\The information of the final DataFrame:")
print(final_df.info())


output_filename = 'final_nvda_stock_sentiment_data.csv'
final_df.to_csv(output_filename, index=False)
print(f"The final dataset has been successfully saved to the file: {output_filename}")

print("--- finish step3 ---")




