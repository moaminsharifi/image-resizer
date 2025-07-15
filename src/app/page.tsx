"use client";

import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import NextImage from "next/image";
import {
  UploadCloud,
  FileImage,
  Lock,
  Unlock,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Format = "jpeg" | "png" | "webp";

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [format, setFormat] = useState<Format>("jpeg");
  const [quality, setQuality] = useState<number>(80);
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastEdited, setLastEdited] = useState<'width' | 'height' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        setImagePreview(resultStr);
        const img = new Image();
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height });
          setWidth(String(img.width));
          setHeight(String(img.height));
        };
        img.src = resultStr;
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a valid image file (PNG, JPEG, WebP, etc.).",
        variant: "destructive",
      });
    }
  };
  
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDrag(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    if (!keepAspectRatio || !originalDimensions || lastEdited !== 'width') return;
    
    const aspectRatio = originalDimensions.width / originalDimensions.height;
    const newWidth = parseInt(width, 10);

    if (!isNaN(newWidth)) {
      setHeight(String(Math.round(newWidth / aspectRatio)));
    }
  }, [width, keepAspectRatio, originalDimensions, lastEdited]);

  useEffect(() => {
    if (!keepAspectRatio || !originalDimensions || lastEdited !== 'height') return;

    const aspectRatio = originalDimensions.width / originalDimensions.height;
    const newHeight = parseInt(height, 10);
    
    if (!isNaN(newHeight)) {
      setWidth(String(Math.round(newHeight * aspectRatio)));
    }
  }, [height, keepAspectRatio, originalDimensions, lastEdited]);


  const handleDownload = async () => {
    if (!imageFile || !imagePreview) {
      toast({
        title: "No Image",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      const img = new Image();
      img.src = imagePreview;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const newWidth = parseInt(width, 10);
      const newHeight = parseInt(height, 10);

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const mimeType = `image/${format}`;
      const dataUrl = canvas.toDataURL(mimeType, format !== 'png' ? quality / 100 : undefined);

      const link = document.createElement("a");
      link.href = dataUrl;
      const originalName = imageFile.name.substring(0, imageFile.name.lastIndexOf('.'));
      link.download = `${originalName}_${newWidth}x${newHeight}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
       toast({
        title: "Download Started",
        description: "Your processed image is downloading.",
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Error",
        description: "Something went wrong while processing your image.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="text-accent h-6 w-6" />
              <CardTitle className="text-2xl font-headline">Imagerite</CardTitle>
            </div>
            <CardDescription>Upload, resize, and optimize your images in seconds.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-6">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200",
                isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDragOver={(e) => handleDrag(e, true)}
              onDrop={handleDrop}
            >
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-semibold text-accent">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
              />
            </div>
            
            {imageFile && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="width">Width (px)</Label>
                        <Input id="width" type="number" value={width} onChange={(e) => { setWidth(e.target.value); setLastEdited('width'); }} />
                    </div>
                    <Button variant="ghost" size="icon" className="mb-1" onClick={() => setKeepAspectRatio(!keepAspectRatio)}>
                        {keepAspectRatio ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <div className="space-y-2">
                        <Label htmlFor="height">Height (px)</Label>
                        <Input id="height" type="number" value={height} onChange={(e) => { setHeight(e.target.value); setLastEdited('height'); }} />
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                   <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                    <SelectTrigger id="format" className="w-full">
                      <SelectValue placeholder="Select a format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {format !== 'png' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="quality">Quality</Label>
                      <span className="text-sm font-medium text-muted-foreground">{quality}%</span>
                    </div>
                    <Slider
                      id="quality"
                      min={1}
                      max={100}
                      step={1}
                      value={[quality]}
                      onValueChange={(v) => setQuality(v[0])}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={handleDownload}
              disabled={!imageFile || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? "Processing..." : "Download Image"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex items-center justify-center p-4 min-h-[400px] lg:min-h-0 bg-card/50">
          {imagePreview ? (
            <div className="relative w-full h-full max-h-[70vh]">
              <NextImage
                src={imagePreview}
                alt="Image Preview"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                style={{ objectFit: 'contain' }}
                className="rounded-lg"
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <FileImage className="mx-auto h-24 w-24" />
              <p className="mt-4 font-medium">Image Preview</p>
              <p className="text-sm">Your uploaded image will appear here.</p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
